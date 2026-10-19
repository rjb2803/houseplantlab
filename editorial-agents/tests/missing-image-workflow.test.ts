import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditMissingFeaturedImages, repairNextMissingFeaturedImage } from "../src/missing-image-workflow.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const env = { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "publisher", WP_APP_PASSWORD: "secret", OPENAI_API_KEY: "test" };

async function createProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-missing-image-"));
  const queueDirectory = path.join(root, "content-production", "queue");
  await mkdir(queueDirectory, { recursive: true });
  await writeFile(path.join(queueDirectory, "articles.json"), JSON.stringify({
    version: 1, timeZone: "Europe/London", maxRunsPerDay: 40,
    items: [{
      id: "monstera-yellow-leaves", assignment: "Prepare a thoroughly sourced article about yellow Monstera leaves.",
      plant: "Monstera deliciosa", priority: 1, status: "published", attempts: 1,
      createdAt: "2026-10-08T09:00:00.000Z", updatedAt: "2026-10-08T12:00:00.000Z",
      lastAttemptAt: "2026-10-08T10:00:00.000Z", lastRunId: "fixture-run", lastOutputPath: "content-production/runs/fixture-run", lastError: null,
      wordpressPostId: 42, wordpressEditUrl: "https://houseplantlab.co.uk/wp-admin/post.php?post=42&action=edit", wordpressSyncedAt: "2026-10-08T11:00:00.000Z",
      wordpressMediaId: null, publishedUrl: "https://houseplantlab.co.uk/monstera-yellow-leaves/", publishedAt: "2026-10-08T12:00:00.000Z", seoBriefPath: null,
    }],
  }));
  return root;
}

function article(featuredMedia: number) {
  return {
    id: 42, slug: "monstera-yellow-leaves", link: "https://houseplantlab.co.uk/monstera-yellow-leaves/",
    status: "publish", featured_media: featuredMedia,
    title: { rendered: "Monstera &amp; Yellow Leaves" }, excerpt: { rendered: "<p>A useful guide.</p>" },
  };
}

test("audit reports confirmed published queue articles without a featured image", async () => {
  const root = await createProject();
  const result = await auditMissingFeaturedImages(root, {
    env,
    fetch: async () => new Response(JSON.stringify([article(0), {
      id: 999, slug: "unknown-post", link: "https://houseplantlab.co.uk/unknown-post/", status: "publish", featured_media: 0,
      title: { rendered: "Unknown" }, excerpt: { rendered: "" },
    }]), { status: 200, headers: { "X-WP-TotalPages": "1" } }),
  });
  assert.equal(result.publishedQueueArticles, 1);
  assert.equal(result.matchedLiveArticles, 1);
  assert.equal(result.publishedEditorialPages, 0);
  assert.equal(result.missingCount, 1);
  assert.equal(result.missing[0]?.title, "Monstera & Yellow Leaves");
});

test("repair attaches one generated image and verifies it without changing article content", async () => {
  const root = await createProject();
  const methods: string[] = [];
  const result = await repairNextMissingFeaturedImage(root, {
    env,
    now: () => new Date("2026-10-09T12:00:00.000Z"),
    generateImage: async () => png,
    fetch: async (input, init) => {
      const url = String(input);
      methods.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
      if (url.includes("/wp-json/wp/v2/posts?") && !init?.method) return new Response(JSON.stringify([article(0)]), { status: 200, headers: { "X-WP-TotalPages": "1" } });
      if (url.includes("/wp-json/wp/v2/pages?") && !init?.method) return new Response(JSON.stringify([]), { status: 200, headers: { "X-WP-TotalPages": "1" } });
      if (url.endsWith("/wp-json/wp/v2/media")) return new Response(JSON.stringify({ id: 99, source_url: "https://houseplantlab.co.uk/uploads/hero.png" }), { status: 201 });
      if (url.endsWith("/wp-json/wp/v2/media/99")) return new Response(JSON.stringify({ id: 99, source_url: "https://houseplantlab.co.uk/uploads/hero.png" }), { status: 200 });
      if (url.endsWith("/wp-json/wp/v2/posts/42") && init?.method === "POST") {
        assert.deepEqual(JSON.parse(String(init.body)), { featured_media: 99 });
        return new Response(JSON.stringify({ id: 42, status: "publish", featured_media: 99, link: article(0).link }), { status: 200 });
      }
      if (url.includes("/wp-json/wp/v2/posts/42?") && !init?.method) return new Response(JSON.stringify({ id: 42, status: "publish", featured_media: 99, link: article(0).link }), { status: 200 });
      if (url === article(0).link) return new Response("<html>ok</html>", { status: 200 });
      throw new Error(`Unexpected request: ${url}`);
    },
  });
  assert.equal(result.outcome, "image-repaired");
  assert.equal(result.mediaId, 99);
  assert.deepEqual(methods, [
    "GET /wp-json/wp/v2/posts", "GET /wp-json/wp/v2/pages", "POST /wp-json/wp/v2/media", "POST /wp-json/wp/v2/media/99",
    "POST /wp-json/wp/v2/posts/42", "GET /wp-json/wp/v2/posts/42", "GET /monstera-yellow-leaves/",
  ]);
});

test("audit includes public editorial hub pages but excludes legal pages", async () => {
  const root = await createProject();
  const hub = {
    id: 70, slug: "propagation", link: "https://houseplantlab.co.uk/care-guides/propagation/",
    status: "publish", featured_media: 0,
    title: { rendered: "Propagating Houseplants" }, excerpt: { rendered: "Plant-specific propagation guides." },
  };
  const legal = { ...hub, id: 71, slug: "privacy-policy", link: "https://houseplantlab.co.uk/privacy-policy/" };
  const result = await auditMissingFeaturedImages(root, {
    env,
    fetch: async (input) => {
      const url = String(input);
      if (url.includes("/wp-json/wp/v2/posts?")) return new Response(JSON.stringify([article(1)]), { status: 200, headers: { "X-WP-TotalPages": "1" } });
      if (url.includes("/wp-json/wp/v2/pages?")) return new Response(JSON.stringify([hub, legal]), { status: 200, headers: { "X-WP-TotalPages": "1" } });
      throw new Error(`Unexpected request: ${url}`);
    },
  });
  assert.equal(result.publishedEditorialPages, 1);
  assert.equal(result.missingCount, 1);
  assert.equal(result.missing[0]?.restType, "pages");
  assert.equal(result.missing[0]?.title, "Propagating Houseplants");
});
