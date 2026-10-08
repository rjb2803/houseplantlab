import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fixtureBrief, fixtureDraft, fixtureEditorial, fixtureEvidence } from "../src/fixture.js";
import { renderBundleContent, syncReadyDraftToWordPress } from "../src/publisher.js";
import { WorkflowBundleSchema } from "../src/schemas.js";

async function createProject(qualityPassed = true): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-publisher-"));
  const runPath = path.join(root, "content-production", "runs", "fixture-run");
  const queuePath = path.join(root, "content-production", "queue");
  await mkdir(runPath, { recursive: true });
  await mkdir(queuePath, { recursive: true });
  await writeFile(path.join(runPath, "bundle.json"), JSON.stringify({
    run: { id: "fixture-run", mode: "fixture", startedAt: "2026-10-08T10:00:00.000Z", completedAt: "2026-10-08T10:01:00.000Z", revisionCount: 0 },
    brief: fixtureBrief,
    evidence: fixtureEvidence,
    draft: fixtureDraft,
    editorial: fixtureEditorial,
    editorialHistory: [fixtureEditorial],
    quality: { passed: qualityPassed, checkedAt: "2026-10-08T10:01:00.000Z", errors: qualityPassed ? [] : ["blocked"], warnings: [] },
  }));
  await writeFile(path.join(queuePath, "articles.json"), JSON.stringify({
    version: 1,
    timeZone: "Europe/London",
    maxRunsPerDay: 2,
    items: [{
      id: "monstera-yellow-leaves", assignment: "Prepare a thoroughly sourced article about yellow Monstera leaves.", plant: "Monstera deliciosa", priority: 1,
      status: "ready-for-human-review", attempts: 1, createdAt: "2026-10-08T09:00:00.000Z", updatedAt: "2026-10-08T10:01:00.000Z",
      lastAttemptAt: "2026-10-08T10:00:00.000Z", lastRunId: "fixture-run", lastOutputPath: "content-production/runs/fixture-run", lastError: null,
    }],
  }));
  return root;
}

test("publisher creates only a WordPress draft and records its edit URL", async () => {
  const root = await createProject();
  let receivedStatus: unknown;
  const result = await syncReadyDraftToWordPress(root, {
    env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "publisher", WP_APP_PASSWORD: "secret" },
    now: () => new Date("2026-10-08T11:00:00.000Z"),
    fetch: async (input, init) => {
      assert.equal(String(input), "https://houseplantlab.co.uk/wp-json/wp/v2/posts");
      const receivedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      receivedStatus = receivedBody.status;
      assert.equal(init?.redirect, "error");
      assert.match(String((init?.headers as Record<string, string>).Authorization), /^Basic /);
      return new Response(JSON.stringify({ id: 42, status: "draft", link: "https://houseplantlab.co.uk/?p=42" }), { status: 201, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(receivedStatus, "draft");
  assert.equal(result.outcome, "wordpress-draft");
  const queue = JSON.parse(await readFile(path.join(root, "content-production", "queue", "articles.json"), "utf8"));
  assert.equal(queue.items[0].status, "wordpress-draft");
  assert.equal(queue.items[0].wordpressPostId, 42);
});

test("publisher refuses a package that failed quality checks", async () => {
  const root = await createProject(false);
  let called = false;
  await assert.rejects(() => syncReadyDraftToWordPress(root, {
    env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "publisher", WP_APP_PASSWORD: "secret" },
    fetch: async () => { called = true; throw new Error("must not be called"); },
  }), /has not passed/);
  assert.equal(called, false);
});

test("publisher updates an existing WordPress draft instead of creating a duplicate", async () => {
  const root = await createProject();
  const queuePath = path.join(root, "content-production", "queue", "articles.json");
  const queue = JSON.parse(await readFile(queuePath, "utf8"));
  queue.items[0].wordpressPostId = 42;
  await writeFile(queuePath, JSON.stringify(queue));
  let endpoint = "";
  const result = await syncReadyDraftToWordPress(root, {
    env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "publisher", WP_APP_PASSWORD: "secret" },
    fetch: async (input) => {
      endpoint = String(input);
      return new Response(JSON.stringify({ id: 42, status: "draft", link: "https://houseplantlab.co.uk/?p=42" }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(endpoint, "https://houseplantlab.co.uk/wp-json/wp/v2/posts/42");
  assert.match(result.message, /updated/);
});

test("publisher refuses to send credentials to another host", async () => {
  const root = await createProject();
  await assert.rejects(() => syncReadyDraftToWordPress(root, {
    env: { WP_SITE_URL: "https://example.com", WP_USERNAME: "publisher", WP_APP_PASSWORD: "secret" },
  }), /HouseplantLab production origin/);
});

test("publisher refuses an unexpected published response", async () => {
  const root = await createProject();
  await assert.rejects(() => syncReadyDraftToWordPress(root, {
    env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "publisher", WP_APP_PASSWORD: "secret" },
    fetch: async () => new Response(JSON.stringify({ id: 42, status: "publish", link: "https://houseplantlab.co.uk/?p=42" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  }), (error: unknown) => error instanceof Error && error.message.includes("draft") && error.message.includes("status"));
});

test("reader-facing rendering strips internal references everywhere", () => {
  const bundle = WorkflowBundleSchema.parse({
    run: { id: "fixture-run", mode: "fixture", startedAt: "2026-10-08T10:00:00.000Z", completedAt: "2026-10-08T10:01:00.000Z", revisionCount: 0 },
    brief: fixtureBrief,
    evidence: fixtureEvidence,
    draft: {
      ...fixtureDraft,
      openingAnswer: `${fixtureDraft.openingAnswer} [S1][S2]`,
      sections: fixtureDraft.sections.map((section, index) => index === 0
        ? { ...section, markdown: `${section.markdown} [S1]\n\nEvidence: S1` }
        : section),
    },
    editorial: fixtureEditorial,
    editorialHistory: [fixtureEditorial],
    quality: { passed: true, checkedAt: "2026-10-08T10:01:00.000Z", errors: [], warnings: [] },
  });
  const html = renderBundleContent(bundle);
  assert.doesNotMatch(html, /\[S\d+\]/);
  assert.doesNotMatch(html, /Evidence:/);
  assert.doesNotMatch(html, /Sources and further reading/);
});
