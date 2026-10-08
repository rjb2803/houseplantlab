import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fixtureBrief, fixtureDraft, fixtureEditorial, fixtureEvidence } from "../src/fixture.js";
import { runAutonomousWorker } from "../src/queue.js";
import { runFixtureWorkflow } from "../src/workflow.js";

async function makeProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-agents-"));
  await mkdir(path.join(root, "content-production", "queue"), { recursive: true });
  await writeFile(
    path.join(root, "content-production", "site-manifest.json"),
    JSON.stringify({ existingArticleSlugs: [], allowedInternalPaths: ["/plants/monstera-deliciosa/"] }),
  );
  await writeFile(
    path.join(root, "content-production", "queue", "articles.json"),
    JSON.stringify({
      version: 1,
      timeZone: "Europe/London",
      maxRunsPerDay: 2,
      items: [
        {
          id: "first-topic",
          assignment: "Prepare an evidence-led article about yellow Monstera leaves in UK homes.",
          plant: "Monstera deliciosa",
          priority: 1,
          status: "queued",
          attempts: 0,
          createdAt: "2026-10-08T08:00:00.000Z",
          updatedAt: "2026-10-08T08:00:00.000Z",
          lastAttemptAt: null,
          lastRunId: null,
          lastOutputPath: null,
          lastError: null,
        },
      ],
    }),
  );
  return root;
}

test("autonomous worker completes one queued item and leaves it for review", async () => {
  const root = await makeProject();
  const result = await runAutonomousWorker(root, {
    now: () => new Date("2026-10-08T09:00:00.000Z"),
    workflow: async () => runFixtureWorkflow({ allowedInternalPaths: ["/plants/monstera-deliciosa/"] }),
    persistBundle: async (_root, bundle) => {
      assert.equal(bundle.brief.slug, fixtureBrief.slug);
      assert.equal(bundle.evidence.briefSlug, fixtureEvidence.briefSlug);
      assert.equal(bundle.draft.slug, fixtureDraft.slug);
      assert.equal(bundle.editorial.status, fixtureEditorial.status);
      return path.join(root, "content-production", "runs", bundle.run.id);
    },
  });
  assert.equal(result.outcome, "ready-for-human-review");
  const queue = JSON.parse(await readFile(path.join(root, "content-production", "queue", "articles.json"), "utf8"));
  assert.equal(queue.items[0].status, "ready-for-human-review");
  assert.equal(queue.items[0].attempts, 1);
});

test("autonomous worker respects the daily run limit", async () => {
  const root = await makeProject();
  const queuePath = path.join(root, "content-production", "queue", "articles.json");
  const queue = JSON.parse(await readFile(queuePath, "utf8"));
  queue.maxRunsPerDay = 1;
  queue.items[0].lastAttemptAt = "2026-10-08T08:30:00.000Z";
  await writeFile(queuePath, JSON.stringify(queue));
  const result = await runAutonomousWorker(root, { now: () => new Date("2026-10-08T09:00:00.000Z") });
  assert.equal(result.outcome, "daily-limit");
});

test("an explicit manual force run may exceed the scheduled daily limit", async () => {
  const root = await makeProject();
  const queuePath = path.join(root, "content-production", "queue", "articles.json");
  const queue = JSON.parse(await readFile(queuePath, "utf8"));
  queue.maxRunsPerDay = 1;
  queue.items[0].lastAttemptAt = "2026-10-08T08:30:00.000Z";
  await writeFile(queuePath, JSON.stringify(queue));
  const result = await runAutonomousWorker(root, {
    now: () => new Date("2026-10-08T09:00:00.000Z"),
    ignoreDailyLimit: true,
    workflow: async () => runFixtureWorkflow({ allowedInternalPaths: ["/plants/monstera-deliciosa/"] }),
    persistBundle: async (_root, bundle) => path.join(root, "content-production", "runs", bundle.run.id),
  });
  assert.equal(result.outcome, "ready-for-human-review");
});

