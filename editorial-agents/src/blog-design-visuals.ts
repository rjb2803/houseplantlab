import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { BlogDesignResearchPackageSchema, type BlogDesignResearchPackage } from "./schemas.js";

const DEFAULT_IMAGE_MODEL = "gpt-image-2.5-flare";

export interface BlogDesignVisualDependencies {
  generateImage?: (prompt: string, model: string) => Promise<Buffer>;
  env?: NodeJS.ProcessEnv;
}

export interface BlogDesignVisualResult {
  outcome: "design-images-ready-for-review";
  imagePaths: string[];
  manifestPath: string;
  message: string;
}

function safeRelative(projectRoot: string, target: string): string {
  const relative = path.relative(projectRoot, target).replaceAll("\\", "/");
  if (relative.startsWith("../") || path.isAbsolute(relative)) {
    throw new Error("Blog design visual workflow refused a path outside the HouseplantLab project.");
  }
  return relative;
}

function visualPrompt(pkg: BlogDesignResearchPackage, directionIndex: number): string {
  const direction = pkg.directions[directionIndex];
  const zones = direction.layoutZones.map((zone) => `${zone.name}: ${zone.desktop}`).join("\n");
  return [
    "Use case: ui-mockup",
    "Asset type: high-fidelity desktop website design concept image for the HouseplantLab blog index",
    `Primary request: Render design direction ${directionIndex + 1}, \"${direction.name}\". ${direction.concept}`,
    `Visual character: ${direction.visualCharacter}`,
    "Implementation target: the composition must be realistically buildable using semantic HTML5 landmarks and Tailwind CSS grid, flex, spacing, typography, responsive and state utilities.",
    "Layout zones:",
    zones,
    "Composition: straight-on full desktop web page, 1440px-style viewport, header through several content sections and footer, disciplined max-width grid, clear responsive reading order.",
    "Brand: warm ivory and paper surfaces, dark botanical green, sage accents, editorial serif headings, clean sans-serif body type, rounded photography-led cards and restrained decoration.",
    "Visible text: use HouseplantLab and the exact direction name; keep other labels short, correctly spelled and useful.",
    "Advertising: include only the restrained, clearly labelled reserved placements described by the design; never imitate editorial controls.",
    "Avoid: overlapping collage, impossible floating elements, glassmorphism, tiny illegible text, lorem ipsum, fake metrics, popups, interstitials, sticky ads, dark patterns, watermark.",
  ].join("\n");
}

async function defaultGenerateImage(prompt: string, model: string): Promise<Buffer> {
  const client = new OpenAI();
  const result = await client.images.generate({ model, prompt, size: "1536x1024", quality: "high" });
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw new Error("Image API completed without blog design image data.");
  return Buffer.from(encoded, "base64");
}

export async function generateBlogDesignImages(
  projectRoot: string,
  outputDirectory: string,
  dependencies: BlogDesignVisualDependencies = {},
): Promise<BlogDesignVisualResult> {
  const env = dependencies.env ?? process.env;
  if (!env.OPENAI_API_KEY?.trim() && !dependencies.generateImage) {
    throw new Error("OPENAI_API_KEY is required to render blog design images.");
  }
  const absoluteOutput = path.resolve(projectRoot, outputDirectory);
  safeRelative(projectRoot, absoluteOutput);
  const researchPath = path.join(absoluteOutput, "research.json");
  const pkg = BlogDesignResearchPackageSchema.parse(JSON.parse(await readFile(researchPath, "utf8")));
  const model = env.HPL_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const generateImage = dependencies.generateImage ?? defaultGenerateImage;
  const imagePaths: string[] = [];
  const records: Array<{ directionId: string; directionName: string; imagePath: string; prompt: string }> = [];

  for (const [index, direction] of pkg.directions.entries()) {
    const prompt = visualPrompt(pkg, index);
    const image = await generateImage(prompt, model);
    if (image.length < 8 || image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      throw new Error(`Image generator did not return a valid PNG for ${direction.name}.`);
    }
    const filename = `${direction.id}-${direction.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
    const imagePath = path.join(absoluteOutput, filename);
    await writeFile(imagePath, image, { flag: "wx" });
    const relativePath = safeRelative(projectRoot, imagePath);
    imagePaths.push(relativePath);
    records.push({ directionId: direction.id, directionName: direction.name, imagePath: relativePath, prompt });
  }

  const manifestPath = path.join(absoluteOutput, "design-images.json");
  await writeFile(manifestPath, `${JSON.stringify({
    status: "human-review-required",
    model,
    implementationTarget: "semantic-html5-tailwind-css",
    images: records,
  }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return {
    outcome: "design-images-ready-for-review",
    imagePaths,
    manifestPath: safeRelative(projectRoot, manifestPath),
    message: "Three design images are ready for owner review. No theme or live-site files were changed.",
  };
}
