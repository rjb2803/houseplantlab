import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fixtureBrief, fixtureDraft, fixtureEditorial, fixtureEvidence } from "../src/fixture.js";
import { generateNextArticleImage } from "../src/image-workflow.js";
import type { ImageBrief } from "../src/schemas.js";

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function createProject(qualityPassed = true): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-image-"));
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
    version: 1, timeZone: "Europe/London", maxRunsPerDay: 2,
    items: [{
      id: "monstera-yellow-leaves", assignment: "Prepare a thoroughly sourced article about yellow Monstera leaves.", plant: "Monstera deliciosa", priority: 1,
      status: "ready-for-human-review", attempts: 1, createdAt: "2026-10-08T09:00:00.000Z", updatedAt: "2026-10-08T10:01:00.000Z",
      lastAttemptAt: "2026-10-08T10:00:00.000Z", lastRunId: "fixture-run", lastOutputPath: "content-production/runs/fixture-run", lastError: null,
    }],
  }));
  return root;
}

function approvedBrief(): ImageBrief {
  return {
    articleSlug: fixtureDraft.slug,
    assetType: "hero",
    prompt: "Create a refined landscape editorial photograph of a botanically plausible Monstera deliciosa in a warm British home, with soft window light, an understated cream wall, botanical green foliage and generous clear space for a separate website heading. No words, labels, logos, watermarks, people, hands, surreal forms or collage effects.",
    filename: `${fixtureDraft.slug}-hero-v1.png`,
    altText: "Monstera deliciosa with yellowing leaves in soft natural light beside a window",
    caption: "Editorial illustration of a Monstera deliciosa with yellowing foliage.",
    classification: "ai-generated-editorial-illustration",
    diagnosticUseAllowed: false,
    visualChecks: ["Plant form is believable", "No text is embedded", "Leaf symptoms are restrained", "Composition works as a landscape hero"],
  };
}

test("image workflow writes a review-only PNG and auditable manifest", async () => {
  const root = await createProject();
  const result = await generateNextArticleImage(root, {
    env: {},
    now: () => new Date("2026-10-08T12:00:00.000Z"),
    createBrief: async () => approvedBrief(),
    generateImage: async () => onePixelPng,
  });
  assert.equal(result.outcome, "image-ready-for-review");
  const manifest = JSON.parse(await readFile(path.join(root, result.manifestPath), "utf8"));
  assert.equal(manifest.status, "human-review-required");
  assert.equal(manifest.brief.classification, "ai-generated-editorial-illustration");
  assert.equal(manifest.brief.diagnosticUseAllowed, false);
  assert.match(result.imagePath, /images\/.*-hero-v1\.png$/);
});

test("image workflow refuses an article that failed editorial quality", async () => {
  const root = await createProject(false);
  let generated = false;
  await assert.rejects(() => generateNextArticleImage(root, {
    env: {},
    createBrief: async () => approvedBrief(),
    generateImage: async () => { generated = true; return onePixelPng; },
  }), /has not passed/);
  assert.equal(generated, false);
});

test("image workflow rejects a brief for another article", async () => {
  const root = await createProject();
  await assert.rejects(() => generateNextArticleImage(root, {
    env: {},
    createBrief: async () => ({ ...approvedBrief(), articleSlug: "another-article" }),
    generateImage: async () => onePixelPng,
  }), /does not belong/);
});
