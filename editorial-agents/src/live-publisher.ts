import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { EditorialQueueSchema, ImageManifestSchema, WorkflowBundleSchema } from "./schemas.js";

const MediaResponseSchema = z.object({
  id: z.number().int().positive(),
  source_url: z.string().url(),
});

const PublishedPostResponseSchema = z.object({
  id: z.number().int().positive(),
  status: z.literal("publish"),
  featured_media: z.number().int().positive(),
  link: z.string().url(),
});

export interface LivePublishResult {
  outcome: "published";
  itemId: string;
  postId: number;
  mediaId: number;
  publishedUrl: string;
  message: string;
}

export interface LivePublisherDependencies {
  fetch?: typeof fetch;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
}

function productionOrigin(env: NodeJS.ProcessEnv): { origin: URL; authorization: string } {
  const siteUrl = env.WP_SITE_URL?.trim();
  const username = env.WP_USERNAME?.trim();
  const appPassword = env.WP_APP_PASSWORD?.trim();
  if (!siteUrl || !username || !appPassword) throw new Error("WP_SITE_URL, WP_USERNAME and WP_APP_PASSWORD are required.");
  const origin = new URL(siteUrl);
  if (origin.protocol !== "https:" || origin.port || origin.username || origin.password
    || !["houseplantlab.co.uk", "www.houseplantlab.co.uk"].includes(origin.hostname)) {
    throw new Error("WP_SITE_URL must be the HTTPS HouseplantLab production origin.");
  }
  return { origin, authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}` };
}

async function errorMessage(response: Response, action: string): Promise<Error> {
  let detail = "";
  try {
    const body = await response.json() as { message?: string };
    detail = body.message ? ` ${body.message}` : "";
  } catch {
    // WordPress can return HTML for host-level errors; the status remains useful.
  }
  return new Error(`${action} failed with HTTP ${response.status}.${detail}`);
}

export async function publishDraftWithHero(
  projectRoot: string,
  dependencies: LivePublisherDependencies = {},
): Promise<LivePublishResult> {
  const { origin, authorization } = productionOrigin(dependencies.env ?? process.env);
  const queuePath = path.join(projectRoot, "content-production", "queue", "articles.json");
  let queue = EditorialQueueSchema.parse(JSON.parse(await readFile(queuePath, "utf8")));
  const item = [...queue.items]
    .filter((candidate) => candidate.status === "wordpress-draft" && candidate.wordpressPostId && candidate.lastOutputPath)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (!item?.lastOutputPath || !item.wordpressPostId) throw new Error("No WordPress draft is ready for image upload and publication.");

  const runsRoot = path.resolve(projectRoot, "content-production", "runs");
  const runDirectory = path.resolve(projectRoot, item.lastOutputPath);
  if (!runDirectory.startsWith(`${runsRoot}${path.sep}`)) throw new Error("Queue output path escapes the approved runs directory.");
  const bundle = WorkflowBundleSchema.parse(JSON.parse(await readFile(path.join(runDirectory, "bundle.json"), "utf8")));
  if (!bundle.quality.passed || bundle.editorial.status !== "ready-for-human-review" || bundle.editorial.unsupportedClaims.length) {
    throw new Error("The selected package has not passed the editorial and quality gates.");
  }

  const imagesDirectory = path.join(runDirectory, "images");
  const manifestFilename = (await readdir(imagesDirectory)).filter((name) => name.endsWith(".json")).sort().at(-1);
  if (!manifestFilename) throw new Error("The selected WordPress draft has no reviewed image manifest.");
  const manifest = ImageManifestSchema.parse(JSON.parse(await readFile(path.join(imagesDirectory, manifestFilename), "utf8")));
  if (manifest.status !== "human-review-required" || manifest.brief.diagnosticUseAllowed) {
    throw new Error("The image manifest does not satisfy the editorial illustration safety boundary.");
  }
  const imagePath = path.resolve(projectRoot, manifest.imagePath);
  if (!imagePath.startsWith(`${imagesDirectory}${path.sep}`)) throw new Error("Image manifest path escapes the selected article run.");
  const image = await readFile(imagePath);

  const request = dependencies.fetch ?? fetch;
  const mediaResponse = await request(new URL("/wp-json/wp/v2/media", origin), {
    method: "POST",
    redirect: "error",
    headers: {
      Authorization: authorization,
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${manifest.brief.filename}"`,
    },
    body: new Uint8Array(image),
  });
  if (!mediaResponse.ok) throw await errorMessage(mediaResponse, "WordPress media upload");
  const media = MediaResponseSchema.parse(await mediaResponse.json());

  const metadataResponse = await request(new URL(`/wp-json/wp/v2/media/${media.id}`, origin), {
    method: "POST",
    redirect: "error",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ alt_text: manifest.brief.altText, caption: manifest.brief.caption }),
  });
  if (!metadataResponse.ok) throw await errorMessage(metadataResponse, "WordPress media metadata update");

  const postResponse = await request(new URL(`/wp-json/wp/v2/posts/${item.wordpressPostId}`, origin), {
    method: "POST",
    redirect: "error",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "publish", featured_media: media.id }),
  });
  if (!postResponse.ok) throw await errorMessage(postResponse, "WordPress publication");
  const publishedPost = PublishedPostResponseSchema.parse(await postResponse.json());
  if (publishedPost.id !== item.wordpressPostId || publishedPost.featured_media !== media.id) {
    throw new Error("WordPress returned an unexpected post or featured image after publication.");
  }

  const publishedAt = (dependencies.now?.() ?? new Date()).toISOString();
  queue = {
    ...queue,
    items: queue.items.map((candidate) => candidate.id === item.id ? {
      ...candidate,
      status: "published" as const,
      updatedAt: publishedAt,
      wordpressMediaId: media.id,
      publishedUrl: publishedPost.link,
      publishedAt,
      lastError: null,
    } : candidate),
  };
  const temporaryPath = `${queuePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  await rename(temporaryPath, queuePath);

  return {
    outcome: "published",
    itemId: item.id,
    postId: publishedPost.id,
    mediaId: media.id,
    publishedUrl: publishedPost.link,
    message: "Article published with one featured hero image. Post-publication review is required.",
  };
}
