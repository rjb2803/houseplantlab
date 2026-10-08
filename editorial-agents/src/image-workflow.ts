import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { run } from "@openai/agents";
import OpenAI from "openai";
import { imageDirectorAgent } from "./agents.js";
import {
  EditorialQueueSchema,
  ImageBriefSchema,
  ImageManifestSchema,
  WorkflowBundleSchema,
  type ImageBrief,
  type ImageManifest,
} from "./schemas.js";

const DEFAULT_IMAGE_MODEL = "gpt-image-2.5-flare";

export interface ImageGenerationResult {
  outcome: "image-ready-for-review";
  itemId: string;
  imagePath: string;
  manifestPath: string;
  message: string;
}

export interface ImageWorkflowDependencies {
  now?: () => Date;
  createBrief?: (input: string) => Promise<ImageBrief>;
  generateImage?: (brief: ImageBrief, model: string) => Promise<Buffer>;
  env?: NodeJS.ProcessEnv;
}

function safeRelative(projectRoot: string, target: string): string {
  const relative = path.relative(projectRoot, target).replaceAll("\\", "/");
  if (relative.startsWith("../") || path.isAbsolute(relative)) {
    throw new Error("Image workflow refused a path outside the HouseplantLab project.");
  }
  return relative;
}

async function defaultCreateBrief(input: string): Promise<ImageBrief> {
  const result = await run(imageDirectorAgent, input);
  if (!result.finalOutput) throw new Error("Image Director completed without an image brief.");
  return ImageBriefSchema.parse(result.finalOutput);
}

async function defaultGenerateImage(brief: ImageBrief, model: string): Promise<Buffer> {
  const client = new OpenAI();
  const result = await client.images.generate({
    model,
    prompt: brief.prompt,
    size: "1536x1024",
    quality: "high",
  });
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw new Error("Image API completed without image data.");
  return Buffer.from(encoded, "base64");
}

export async function generateNextArticleImage(
  projectRoot: string,
  dependencies: ImageWorkflowDependencies = {},
): Promise<ImageGenerationResult> {
  const env = dependencies.env ?? process.env;
  if (!env.OPENAI_API_KEY?.trim() && !dependencies.generateImage) {
    throw new Error("OPENAI_API_KEY is required to generate an article image.");
  }

  const queuePath = path.join(projectRoot, "content-production", "queue", "articles.json");
  const queue = EditorialQueueSchema.parse(JSON.parse(await readFile(queuePath, "utf8")));
  const item = [...queue.items]
    .filter((candidate) => ["ready-for-human-review", "wordpress-draft"].includes(candidate.status) && candidate.lastOutputPath)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (!item?.lastOutputPath) throw new Error("No reviewed article package is available for image generation.");

  const bundlePath = path.resolve(projectRoot, item.lastOutputPath, "bundle.json");
  safeRelative(projectRoot, bundlePath);
  const bundle = WorkflowBundleSchema.parse(JSON.parse(await readFile(bundlePath, "utf8")));
  if (!bundle.quality.passed || bundle.editorial.status !== "ready-for-human-review") {
    throw new Error("The selected article has not passed the editorial review gate.");
  }

  const approvedReference = "content-production/training/images/drooping-monstera-hero-v1.png";
  const input = [
    "Create the hero-image brief for this approved article package.",
    `The owner-approved visual reference is stored at ${approvedReference}. Match its editorial mood and restraint, not its exact composition.`,
    "The resulting image is illustrative only and must not be used as diagnostic evidence.",
    JSON.stringify({ brief: bundle.brief, draft: { title: bundle.draft.title, excerpt: bundle.draft.excerpt } }, null, 2),
  ].join("\n");
  const createBrief = dependencies.createBrief ?? defaultCreateBrief;
  const brief = ImageBriefSchema.parse(await createBrief(input));
  if (brief.articleSlug !== bundle.draft.slug) throw new Error("Image brief does not belong to the selected article.");

  const model = env.HPL_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const generateImage = dependencies.generateImage ?? defaultGenerateImage;
  const image = await generateImage(brief, model);
  if (image.length < 8 || image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Image generator did not return a valid PNG file.");
  }

  const imageDirectory = path.resolve(projectRoot, item.lastOutputPath, "images");
  safeRelative(projectRoot, imageDirectory);
  await mkdir(imageDirectory, { recursive: true });
  const imagePath = path.join(imageDirectory, brief.filename);
  const manifestPath = path.join(imageDirectory, `${path.parse(brief.filename).name}.json`);
  await writeFile(imagePath, image, { flag: "wx" });

  const manifest: ImageManifest = ImageManifestSchema.parse({
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    model,
    status: "human-review-required",
    sourceBundlePath: safeRelative(projectRoot, bundlePath),
    imagePath: safeRelative(projectRoot, imagePath),
    brief,
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

  return {
    outcome: "image-ready-for-review",
    itemId: item.id,
    imagePath: manifest.imagePath,
    manifestPath: safeRelative(projectRoot, manifestPath),
    message: "Hero image and metadata are ready for human visual review. Nothing was uploaded to WordPress.",
  };
}
