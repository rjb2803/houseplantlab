import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialQueueSchema } from "./schemas.js";

const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
const limit = Number(limitArgument?.slice("--limit=".length) ?? "1");
if (!Number.isInteger(limit) || limit < 1 || limit > 40) {
  throw new Error("--limit must be an integer between 1 and 40.");
}

const queuePath = path.join(process.cwd(), "content-production", "queue", "articles.json");
const queue = EditorialQueueSchema.parse(JSON.parse(await readFile(queuePath, "utf8")));
const candidates = queue.items
  .filter((item) => item.status === "failed"
    && item.lastError === "Connection error."
    && !item.wordpressPostId
    && !item.publishedUrl
    && !item.lastOutputPath)
  .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))
  .slice(0, limit);

if (candidates.length === 0) {
  console.log(JSON.stringify({ outcome: "no-work", requeued: [] }, null, 2));
  process.exit(0);
}

const selected = new Set(candidates.map((item) => item.id));
const updatedAt = new Date().toISOString();
const updatedQueue = {
  ...queue,
  items: queue.items.map((item) => selected.has(item.id)
    ? { ...item, status: "queued" as const, updatedAt, lastError: null }
    : item),
};
EditorialQueueSchema.parse(updatedQueue);
const temporaryPath = `${queuePath}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(updatedQueue, null, 2)}\n`, "utf8");
await rename(temporaryPath, queuePath);
console.log(JSON.stringify({ outcome: "requeued", count: candidates.length, requeued: candidates.map((item) => item.id) }, null, 2));
