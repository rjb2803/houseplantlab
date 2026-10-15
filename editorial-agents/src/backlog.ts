import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { EditorialQueueSchema } from "./schemas.js";

const BacklogItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  assignment: z.string().min(80),
  plant: z.string().min(3),
});

const EditorialBacklogSchema = z.object({
  version: z.literal(1),
  targetPublishedCount: z.number().int().positive(),
  items: z.array(BacklogItemSchema),
});

const SiteManifestSchema = z.object({
  existingArticleSlugs: z.array(z.string()),
});

export interface SeedBacklogResult {
  outcome: "queued" | "no-work";
  itemId: string | null;
  message: string;
}

export async function seedNextBacklogItem(projectRoot: string, now = new Date()): Promise<SeedBacklogResult> {
  const queuePath = path.join(projectRoot, "content-production", "queue", "articles.json");
  const manifestPath = path.join(projectRoot, "content-production", "site-manifest.json");
  const backlogPath = path.join(projectRoot, "content-production", "editorial-backlog.json");
  const [queueRaw, manifestRaw, backlogRaw] = await Promise.all([
    readFile(queuePath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(backlogPath, "utf8"),
  ]);
  const queue = EditorialQueueSchema.parse(JSON.parse(queueRaw));
  const manifest = SiteManifestSchema.parse(JSON.parse(manifestRaw));
  const backlog = EditorialBacklogSchema.parse(JSON.parse(backlogRaw));

  const publishedCount = queue.items.filter((item) => item.status === "published").length;
  if (publishedCount >= backlog.targetPublishedCount) {
    return { outcome: "no-work", itemId: null, message: `Publication target reached: ${publishedCount}/${backlog.targetPublishedCount}.` };
  }

  const backlogIds = backlog.items.map((item) => item.id);
  if (new Set(backlogIds).size !== backlogIds.length) throw new Error("Editorial backlog contains duplicate IDs.");

  const queueIds = new Set(queue.items.map((item) => item.id));
  const liveSlugs = new Set(manifest.existingArticleSlugs);
  const next = backlog.items.find((item) => !queueIds.has(item.id) && !liveSlugs.has(item.id));
  if (!next) {
    return { outcome: "no-work", itemId: null, message: "No unused duplicate-safe backlog item remains." };
  }

  const timestamp = now.toISOString();
  const highestPriority = queue.items.reduce((maximum, item) => Math.max(maximum, item.priority), 0);
  const updatedQueue = EditorialQueueSchema.parse({
    ...queue,
    maxRunsPerDay: 3,
    items: [...queue.items, {
      id: next.id,
      assignment: `${next.assignment} Use the exact article slug '${next.id}'. Before drafting, treat any overlapping live slug or substantially equivalent existing topic as a blocker rather than creating a duplicate.`,
      plant: next.plant,
      priority: highestPriority + 1,
      status: "queued",
      attempts: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastAttemptAt: null,
      lastRunId: null,
      lastOutputPath: null,
      lastError: null,
      wordpressPostId: null,
      wordpressEditUrl: null,
      wordpressSyncedAt: null,
      wordpressMediaId: null,
      publishedUrl: null,
      publishedAt: null,
      seoBriefPath: null,
    }],
  });
  const temporaryPath = `${queuePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(updatedQueue, null, 2)}\n`, "utf8");
  await rename(temporaryPath, queuePath);
  return { outcome: "queued", itemId: next.id, message: "Queued one curated article after duplicate checks." };
}
