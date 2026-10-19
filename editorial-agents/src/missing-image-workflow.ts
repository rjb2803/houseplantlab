import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";
import { EditorialQueueSchema } from "./schemas.js";

const DEFAULT_IMAGE_MODEL = "gpt-image-2.5-flare";

const PostSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1),
  link: z.string().url(),
  status: z.literal("publish"),
  featured_media: z.number().int().nonnegative(),
  title: z.object({ rendered: z.string() }),
  excerpt: z.object({ rendered: z.string() }),
});

const MediaSchema = z.object({ id: z.number().int().positive(), source_url: z.string().url() });
const VerifyPostSchema = z.object({
  id: z.number().int().positive(),
  status: z.literal("publish"),
  featured_media: z.number().int().positive(),
  link: z.string().url(),
});

export interface MissingFeaturedImage {
  queueId?: string;
  postId: number;
  restType: "posts" | "pages";
  slug: string;
  title: string;
  url: string;
}

export interface MissingImageAuditResult {
  outcome: "audit-complete";
  publishedQueueArticles: number;
  matchedLiveArticles: number;
  publishedEditorialPages: number;
  missingCount: number;
  missing: MissingFeaturedImage[];
}

export interface MissingImageRepairResult {
  outcome: "no-missing-images" | "image-repaired";
  missingBeforeRepair: number;
  article?: MissingFeaturedImage;
  mediaId?: number;
  imagePath?: string;
  altText?: string;
  message: string;
}

export interface MissingImageDependencies {
  fetch?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  generateImage?: (prompt: string, model: string) => Promise<Buffer>;
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

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function errorMessage(response: Response, action: string): Promise<Error> {
  let detail = "";
  try {
    const body = await response.json() as { message?: string };
    detail = body.message ? ` ${body.message}` : "";
  } catch {
    // Host-level errors may be HTML; the status code remains useful.
  }
  return new Error(`${action} failed with HTTP ${response.status}.${detail}`);
}

async function fetchPublishedPosts(origin: URL, authorization: string, request: typeof fetch): Promise<z.infer<typeof PostSchema>[]> {
  const posts: z.infer<typeof PostSchema>[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const url = new URL("/wp-json/wp/v2/posts", origin);
    url.searchParams.set("status", "publish");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("_fields", "id,slug,link,status,featured_media,title,excerpt");
    const response = await request(url, { headers: { Authorization: authorization }, redirect: "error" });
    if (!response.ok) throw await errorMessage(response, "WordPress article audit");
    const batch = z.array(PostSchema).parse(await response.json());
    posts.push(...batch);
    const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? "1");
    if (page >= totalPages) break;
  }
  return posts;
}

async function fetchPublishedPages(origin: URL, authorization: string, request: typeof fetch): Promise<z.infer<typeof PostSchema>[]> {
  const pages: z.infer<typeof PostSchema>[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const url = new URL("/wp-json/wp/v2/pages", origin);
    url.searchParams.set("status", "publish");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("_fields", "id,slug,link,status,featured_media,title,excerpt");
    const response = await request(url, { headers: { Authorization: authorization }, redirect: "error" });
    if (!response.ok) throw await errorMessage(response, "WordPress editorial-page audit");
    const batch = z.array(PostSchema).parse(await response.json());
    pages.push(...batch);
    const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? "1");
    if (page >= totalPages) break;
  }
  return pages;
}

function isEditorialPage(link: string): boolean {
  const pathname = new URL(link).pathname;
  return /^\/(?:plants|problems|care-guides|tools)(?:\/|$)/.test(pathname);
}

export async function auditMissingFeaturedImages(
  projectRoot: string,
  dependencies: MissingImageDependencies = {},
): Promise<MissingImageAuditResult> {
  const env = dependencies.env ?? process.env;
  const { origin, authorization } = productionOrigin(env);
  const request = dependencies.fetch ?? fetch;
  const queuePath = path.join(projectRoot, "content-production", "queue", "articles.json");
  const queue = EditorialQueueSchema.parse(JSON.parse(await readFile(queuePath, "utf8")));
  const publishedItems = queue.items.filter((item) => item.status === "published" && item.wordpressPostId);
  const livePosts = await fetchPublishedPosts(origin, authorization, request);
  const livePages = (await fetchPublishedPages(origin, authorization, request)).filter((page) => isEditorialPage(page.link));
  const byId = new Map(livePosts.map((post) => [post.id, post]));
  const missingPosts = publishedItems.flatMap((item): MissingFeaturedImage[] => {
    const post = item.wordpressPostId ? byId.get(item.wordpressPostId) : undefined;
    if (!post || post.featured_media !== 0) return [];
    return [{ queueId: item.id, postId: post.id, restType: "posts", slug: post.slug, title: plainText(post.title.rendered), url: post.link }];
  });
  const missingPages = livePages
    .filter((page) => page.featured_media === 0)
    .map((page): MissingFeaturedImage => ({
      postId: page.id, restType: "pages", slug: page.slug,
      title: plainText(page.title.rendered), url: page.link,
    }));
  const missing = [...missingPosts, ...missingPages]
    .sort((a, b) => a.url.localeCompare(b.url));
  return {
    outcome: "audit-complete",
    publishedQueueArticles: publishedItems.length,
    matchedLiveArticles: publishedItems.filter((item) => item.wordpressPostId && byId.has(item.wordpressPostId)).length,
    publishedEditorialPages: livePages.length,
    missingCount: missing.length,
    missing,
  };
}

async function defaultGenerateImage(prompt: string, model: string, env: NodeJS.ProcessEnv): Promise<Buffer> {
  if (!env.OPENAI_API_KEY?.trim()) throw new Error("OPENAI_API_KEY is required to generate an article image.");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const result = await client.images.generate({ model, prompt, size: "1536x1024", quality: "high" });
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw new Error("Image API completed without image data.");
  return Buffer.from(encoded, "base64");
}

export async function repairNextMissingFeaturedImage(
  projectRoot: string,
  dependencies: MissingImageDependencies = {},
): Promise<MissingImageRepairResult> {
  const env = dependencies.env ?? process.env;
  const audit = await auditMissingFeaturedImages(projectRoot, dependencies);
  const article = audit.missing[0];
  if (!article) return { outcome: "no-missing-images", missingBeforeRepair: 0, message: "All confirmed published queue articles have a featured image." };

  const { origin, authorization } = productionOrigin(env);
  const request = dependencies.fetch ?? fetch;
  const model = env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const prompt = [
    `Create one high-quality landscape editorial hero image for the HouseplantLab article titled “${article.title}”.`,
    "Show a botanically plausible houseplant scene in a calm, contemporary British home with soft natural window light, warm cream surroundings and restrained dark botanical green accents.",
    "The subject must clearly relate to the article title without exaggerating damage or presenting the illustration as diagnostic proof.",
    "Use a premium editorial photography aesthetic, natural proportions, realistic leaves and a clean 3:2 composition with useful breathing space.",
    "Do not include words, labels, logos, watermarks, borders, collages, people, hands, impossible leaves, duplicate pots or surreal elements.",
  ].join(" ");
  const altText = `Editorial houseplant illustration for ${article.title}`.slice(0, 180);
  const caption = `AI-generated editorial illustration for “${article.title}”.`;
  const image = dependencies.generateImage
    ? await dependencies.generateImage(prompt, model)
    : await defaultGenerateImage(prompt, model, env);
  if (image.length < 8 || image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Image generation did not return a valid PNG file.");

  const repairDirectory = path.join(projectRoot, "content-production", "image-repair", article.slug);
  await mkdir(repairDirectory, { recursive: true });
  const filename = `${article.slug}-hero-v1.png`;
  const imagePath = path.join(repairDirectory, filename);
  await writeFile(imagePath, image, { flag: "wx" });
  await writeFile(path.join(repairDirectory, `${article.slug}-hero-v1.json`), `${JSON.stringify({
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(), model, article, altText, caption, prompt,
    classification: "ai-generated-editorial-illustration", diagnosticUseAllowed: false,
  }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

  const mediaResponse = await request(new URL("/wp-json/wp/v2/media", origin), {
    method: "POST", redirect: "error",
    headers: { Authorization: authorization, "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${filename}"` },
    body: new Uint8Array(image),
  });
  if (!mediaResponse.ok) throw await errorMessage(mediaResponse, "WordPress media upload");
  const media = MediaSchema.parse(await mediaResponse.json());

  const metadataResponse = await request(new URL(`/wp-json/wp/v2/media/${media.id}`, origin), {
    method: "POST", redirect: "error",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ alt_text: altText, caption }),
  });
  if (!metadataResponse.ok) throw await errorMessage(metadataResponse, "WordPress media metadata update");

  const attachResponse = await request(new URL(`/wp-json/wp/v2/${article.restType}/${article.postId}`, origin), {
    method: "POST", redirect: "error",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ featured_media: media.id }),
  });
  if (!attachResponse.ok) throw await errorMessage(attachResponse, "WordPress featured-image update");

  const verifyUrl = new URL(`/wp-json/wp/v2/${article.restType}/${article.postId}`, origin);
  verifyUrl.searchParams.set("_fields", "id,status,featured_media,link");
  const verifyResponse = await request(verifyUrl, { headers: { Authorization: authorization }, redirect: "error" });
  if (!verifyResponse.ok) throw await errorMessage(verifyResponse, "WordPress featured-image verification");
  const verifiedPost = VerifyPostSchema.parse(await verifyResponse.json());
  if (verifiedPost.id !== article.postId || verifiedPost.featured_media !== media.id) throw new Error("WordPress did not retain the expected featured image.");
  const publicResponse = await request(article.url, { redirect: "error" });
  if (!publicResponse.ok) throw await errorMessage(publicResponse, "Public article verification");

  return {
    outcome: "image-repaired", missingBeforeRepair: audit.missingCount, article, mediaId: media.id,
    imagePath: path.relative(projectRoot, imagePath).replaceAll(path.sep, "/"), altText,
    message: "Generated, uploaded and verified one missing featured image without changing article content.",
  };
}
