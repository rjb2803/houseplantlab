import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildSearchPerformanceSnapshot } from "../src/search-console.js";
import { runSeoPlanningWorkflow } from "../src/seo-workflow.js";
import { auditLiveSite } from "../src/site-audit.js";
import type { SearchPerformanceSnapshot, SiteInventory } from "../src/schemas.js";

test("search performance identifies queries in positions 11 through 20", () => {
  const snapshot = buildSearchPerformanceSnapshot("sc-domain:houseplantlab.co.uk", "2026-09-09", "2026-10-06", "2026-10-09T08:00:00.000Z", [
    { keys: ["https://houseplantlab.co.uk/monstera-drooping/", "why is my monstera drooping"], clicks: 4, impressions: 120, ctr: 4 / 120, position: 12.4 },
    { keys: ["https://houseplantlab.co.uk/monstera-care/", "monstera care"], clicks: 20, impressions: 200, ctr: 0.1, position: 4.2 },
  ]);
  assert.equal(snapshot.strikingDistanceQueries.length, 1);
  assert.equal(snapshot.strikingDistanceQueries[0].query, "why is my monstera drooping");
  assert.equal(snapshot.topPerformingPages[0].page, "https://houseplantlab.co.uk/monstera-care/");
});

test("live site audit finds orphan pages and broken internal paths", async () => {
  const request = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    if (url.includes("/posts?")) return Response.json([{
      id: 11, slug: "monstera-drooping", link: "https://houseplantlab.co.uk/monstera-drooping/", modified_gmt: "2026-10-08T23:10:33",
      title: { rendered: "Monstera drooping" }, content: { rendered: '<a href="/plants/monstera-deliciosa/">Monstera</a><a href="/missing/">Missing</a>' }, categories: [1],
    }]);
    if (url.includes("/pages?")) return Response.json([{
      id: 5, slug: "plants", link: "https://houseplantlab.co.uk/plants/", modified_gmt: "2026-10-08T12:00:00",
      title: { rendered: "Plants" }, content: { rendered: "No links yet" },
    }]);
    if (url.includes("/plant?")) return Response.json([{
      id: 7, slug: "monstera-deliciosa", link: "https://houseplantlab.co.uk/plants/monstera-deliciosa/", modified_gmt: "2026-10-08T12:00:00",
      title: { rendered: "Monstera deliciosa" }, content: { rendered: "Profile" },
    }]);
    return Response.json([{ id: 1, name: "Uncategorized", slug: "uncategorized" }]);
  };
  const inventory = await auditLiveSite(request as typeof fetch, new Date("2026-10-09T08:00:00.000Z"));
  assert.deepEqual(inventory.brokenInternalPaths, ["/missing/"]);
  assert.ok(inventory.orphanPaths.includes("/monstera-drooping/"));
  assert.equal(inventory.pages.length, 3);
});

async function createProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-seo-"));
  await mkdir(path.join(root, "content-production", "queue"), { recursive: true });
  await writeFile(path.join(root, "content-production", "site-manifest.json"), JSON.stringify({
    existingArticleSlugs: [], allowedInternalPaths: ["/plants/"], minimumArticleWords: 1300, maximumArticleWords: 1900, requireClosingSummary: true,
  }));
  await writeFile(path.join(root, "content-production", "queue", "articles.json"), JSON.stringify({
    version: 1, timeZone: "Europe/London", maxRunsPerDay: 2, items: [],
  }));
  return root;
}

const inventory: SiteInventory = {
  auditedAt: "2026-10-09T08:00:00.000Z", origin: "https://houseplantlab.co.uk", brokenInternalPaths: [],
  orphanPaths: ["/why-is-my-monstera-deliciosa-drooping/"], categoryNames: ["Uncategorized"],
  pages: [{ id: 11, type: "post", title: "Why is my Monstera drooping?", slug: "why-is-my-monstera-deliciosa-drooping", url: "https://houseplantlab.co.uk/why-is-my-monstera-deliciosa-drooping/", path: "/why-is-my-monstera-deliciosa-drooping/", modifiedAt: "2026-10-08T23:10:33.000Z", categoryIds: [1], outgoingInternalPaths: ["/plants/monstera-deliciosa/"] }],
};

const performance: SearchPerformanceSnapshot = buildSearchPerformanceSnapshot(
  "sc-domain:houseplantlab.co.uk", "2026-09-09", "2026-10-06", "2026-10-09T08:00:00.000Z",
  [{ keys: ["https://houseplantlab.co.uk/why-is-my-monstera-deliciosa-drooping/", "monstera leaves curling"], clicks: 2, impressions: 80, ctr: 0.025, position: 14.2 }],
);

test("SEO workflow passes measured data into a writer brief and queues a new article", async () => {
  const root = await createProject();
  let briefInput = "";
  const result = await runSeoPlanningWorkflow(root, {
    now: () => new Date("2026-10-09T08:00:00.000Z"),
    inventory: async () => inventory,
    performance: async () => performance,
    architecture: async () => ({
      summary: "The site needs a proper problem-guide cluster and reciprocal internal links around its Monstera profile.",
      requiredHubs: [{ title: "Plant problems", path: "/problems/", purpose: "Connect diagnostic guides." }],
      orphanFixes: [{ orphanPath: "/why-is-my-monstera-deliciosa-drooping/", action: "add-internal-links", linkFromPaths: ["/plants/monstera-deliciosa/"], reason: "The profile should surface its relevant problem guide." }],
      brokenLinkFixes: [], categoryActions: ["Create a Care Guides category."], requiredHumanChecks: ["Review taxonomy names before creation."],
    }),
    brief: async (input) => {
      briefInput = input;
      return {
        recommendationType: "new-article", plant: "Monstera deliciosa", proposedTitle: "Why Are My Monstera Leaves Curling?", proposedSlug: "monstera-leaves-curling",
        targetUrl: null, primaryQuery: "monstera leaves curling", supportingQueries: ["curled monstera leaves"],
        performanceEvidence: { clicks: 2, impressions: 80, ctr: 0.025, averagePosition: 14.2, startDate: "2026-09-09", endDate: "2026-10-06" },
        rationale: "The measured query has meaningful visibility in positions close to page one and no dedicated matching article exists.",
        requiredSections: ["Immediate answer", "Moisture", "Roots", "Light"], linkToPaths: ["/plants/monstera-deliciosa/"],
        requestLinksFromPaths: ["/why-is-my-monstera-deliciosa-drooping/"],
        writerAssignment: "Prepare an evidence-led UK guide answering why Monstera deliciosa leaves curl, using the measured query opportunity and linking to the confirmed plant profile.",
        humanReviewNotes: ["Confirm the search intent before publication."],
      };
    },
  });
  assert.match(briefInput, /14\.2/);
  assert.equal(result.outcome, "brief-ready");
  assert.equal(result.queuedItemId, "monstera-leaves-curling");
  const queue = JSON.parse(await readFile(path.join(root, "content-production", "queue", "articles.json"), "utf8"));
  assert.equal(queue.items[0].seoBriefPath, result.briefPath);
  const manifest = JSON.parse(await readFile(path.join(root, "content-production", "site-manifest.json"), "utf8"));
  assert.deepEqual(manifest.existingArticleSlugs, ["why-is-my-monstera-deliciosa-drooping"]);
});
