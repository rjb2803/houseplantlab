import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fixtureBrief, fixtureDraft, fixtureEditorial, fixtureEvidence } from "../src/fixture.js";
import { publishDraftWithHero } from "../src/live-publisher.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function createProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-live-publisher-"));
  const relativeRun = "content-production/runs/fixture-run";
  const runPath = path.join(root, relativeRun);
  const imagesPath = path.join(runPath, "images");
  const queuePath = path.join(root, "content-production", "queue");
  await mkdir(imagesPath, { recursive: true });
  await mkdir(queuePath, { recursive: true });
  await writeFile(path.join(runPath, "bundle.json"), JSON.stringify({
    run: { id: "fixture-run", mode: "fixture", startedAt: "2026-10-08T10:00:00.000Z", completedAt: "2026-10-08T10:01:00.000Z", revisionCount: 0 },
    brief: fixtureBrief, evidence: fixtureEvidence, draft: fixtureDraft, editorial: fixtureEditorial,
    editorialHistory: [fixtureEditorial], quality: { passed: true, checkedAt: "2026-10-08T10:01:00.000Z", errors: [], warnings: [] },
  }));
  const filename = `${fixtureDraft.slug}-hero-v1.png`;
  await writeFile(path.join(imagesPath, filename), png);
  await writeFile(path.join(imagesPath, `${path.parse(filename).name}.json`), JSON.stringify({
    generatedAt: "2026-10-08T11:00:00.000Z", model: "test-image-model", status: "human-review-required",
    sourceBundlePath: `${relativeRun}/bundle.json`, imagePath: `${relativeRun}/images/${filename}`,
    brief: {
      articleSlug: fixtureDraft.slug, assetType: "hero",
      prompt: "Create a refined landscape editorial photograph of a botanically plausible Monstera deliciosa in a warm British home, with soft window light, an understated cream wall, botanical green foliage and generous clear space for a separate website heading. No words, labels, logos, watermarks, people, hands, surreal forms or collage effects.",
      filename, altText: "Monstera deliciosa in soft natural light beside a window",
      caption: "Editorial illustration of a Monstera deliciosa in a warm home.",
      classification: "ai-generated-editorial-illustration", diagnosticUseAllowed: false,
      visualChecks: ["Plant form is believable", "No text is embedded", "Symptoms are restrained", "Landscape crop is suitable"],
    },
  }));
  await writeFile(path.join(queuePath, "articles.json"), JSON.stringify({
    version: 1, timeZone: "Europe/London", maxRunsPerDay: 2,
    items: [{
      id: "monstera-yellow-leaves", assignment: "Prepare a thoroughly sourced article about yellow Monstera leaves.", plant: "Monstera deliciosa", priority: 1,
      status: "wordpress-draft", attempts: 1, createdAt: "2026-10-08T09:00:00.000Z", updatedAt: "2026-10-08T10:01:00.000Z",
      lastAttemptAt: "2026-10-08T10:00:00.000Z", lastRunId: "fixture-run", lastOutputPath: relativeRun, lastError: null,
      wordpressPostId: 42, wordpressEditUrl: "https://houseplantlab.co.uk/wp-admin/post.php?post=42&action=edit", wordpressSyncedAt: "2026-10-08T10:01:00.000Z",
    }],
  }));
  return root;
}

test("live publisher uploads one image, adds metadata and publishes the matching draft", async () => {
  const root = await createProject();
  const endpoints: string[] = [];
  const result = await publishDraftWithHero(root, {
    env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "publisher", WP_APP_PASSWORD: "secret" },
    now: () => new Date("2026-10-08T12:00:00.000Z"),
    fetch: async (input, init) => {
      const endpoint = String(input);
      endpoints.push(endpoint);
      assert.equal(init?.method, "POST");
      if (endpoint.endsWith("/media")) {
        assert.equal((init?.headers as Record<string, string>)["Content-Type"], "image/png");
        return new Response(JSON.stringify({ id: 99, source_url: "https://houseplantlab.co.uk/uploads/hero.png" }), { status: 201 });
      }
      if (endpoint.endsWith("/media/99")) {
        const body = JSON.parse(String(init?.body));
        assert.match(body.alt_text, /Monstera/);
        return new Response(JSON.stringify({ id: 99, source_url: "https://houseplantlab.co.uk/uploads/hero.png" }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body, { status: "publish", featured_media: 99 });
      return new Response(JSON.stringify({ id: 42, status: "publish", featured_media: 99, link: "https://houseplantlab.co.uk/monstera-yellow-leaves/" }), { status: 200 });
    },
  });
  assert.equal(result.outcome, "published");
  assert.deepEqual(endpoints, [
    "https://houseplantlab.co.uk/wp-json/wp/v2/media",
    "https://houseplantlab.co.uk/wp-json/wp/v2/media/99",
    "https://houseplantlab.co.uk/wp-json/wp/v2/posts/42",
  ]);
  const queue = JSON.parse(await readFile(path.join(root, "content-production", "queue", "articles.json"), "utf8"));
  assert.equal(queue.items[0].status, "published");
  assert.equal(queue.items[0].wordpressMediaId, 99);
});

test("live publisher does not publish when media upload is forbidden", async () => {
  const root = await createProject();
  let calls = 0;
  await assert.rejects(() => publishDraftWithHero(root, {
    env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "publisher", WP_APP_PASSWORD: "secret" },
    fetch: async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: "Sorry, you are not allowed to upload media." }), { status: 403 });
    },
  }), /upload media/);
  assert.equal(calls, 1);
});
