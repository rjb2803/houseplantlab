import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { seedNextBacklogItem } from "../src/backlog.js";

test("backlog seeder queues one unused item and skips live or queued duplicates", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-backlog-"));
  await mkdir(path.join(root, "content-production", "queue"), { recursive: true });
  await writeFile(path.join(root, "content-production", "queue", "articles.json"), JSON.stringify({
    version: 1,
    timeZone: "Europe/London",
    maxRunsPerDay: 40,
    items: [{
      id: "already-queued",
      assignment: "Prepare a sufficiently detailed existing assignment for the duplicate safety fixture.",
      plant: "Houseplants",
      priority: 1,
      status: "published",
      attempts: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
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
  }), "utf8");
  await writeFile(path.join(root, "content-production", "site-manifest.json"), JSON.stringify({
    existingArticleSlugs: ["already-live"],
  }), "utf8");
  await writeFile(path.join(root, "content-production", "editorial-backlog.json"), JSON.stringify({
    version: 1,
    targetPublishedCount: 86,
    items: [
      { id: "already-queued", plant: "Houseplants", assignment: "Prepare an evidence-led article that is deliberately already present in the queue and must be skipped safely." },
      { id: "already-live", plant: "Houseplants", assignment: "Prepare an evidence-led article that is deliberately present in the live manifest and must be skipped safely." },
      { id: "genuinely-new-topic", plant: "Houseplants", assignment: "Prepare a focused evidence-led UK article covering a genuinely unused topic with safe practical reader guidance." },
    ],
  }), "utf8");

  const result = await seedNextBacklogItem(root, new Date("2026-10-15T12:00:00.000Z"));
  assert.equal(result.outcome, "queued");
  assert.equal(result.itemId, "genuinely-new-topic");
  const queue = JSON.parse(await readFile(path.join(root, "content-production", "queue", "articles.json"), "utf8"));
  assert.equal(queue.maxRunsPerDay, 40);
  assert.equal(queue.items.at(-1).id, "genuinely-new-topic");
  assert.equal(queue.items.at(-1).status, "queued");
  assert.match(queue.items.at(-1).assignment, /exact article slug 'genuinely-new-topic'/);
  assert.match(queue.items.at(-1).assignment, /preflight has checked the complete queue and confirmed live manifest/);

  const backlogPath = path.join(root, "content-production", "editorial-backlog.json");
  const backlog = JSON.parse(await readFile(backlogPath, "utf8"));
  await writeFile(backlogPath, JSON.stringify({ ...backlog, targetPublishedCount: 1 }), "utf8");
  const stopped = await seedNextBacklogItem(root, new Date("2026-10-15T13:00:00.000Z"));
  assert.equal(stopped.outcome, "no-work");
  assert.match(stopped.message, /Publication target reached: 1\/1/);
});
