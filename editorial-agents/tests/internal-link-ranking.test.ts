import assert from "node:assert/strict";
import test from "node:test";
import { buildRankingOpportunities, buildStrongSourcePages } from "../src/internal-link-ranking.js";
import { buildSearchPerformanceSnapshot } from "../src/search-console.js";
import type { SiteInventory } from "../src/schemas.js";

const inventory: SiteInventory = {
  auditedAt: "2026-10-10T20:00:00.000Z",
  origin: "https://houseplantlab.co.uk",
  pages: [
    {
      id: 10, type: "post", title: "Monstera drooping", slug: "monstera-drooping",
      url: "https://houseplantlab.co.uk/monstera-drooping/", path: "/monstera-drooping/",
      modifiedAt: "2026-10-10T18:00:00.000Z", categoryIds: [1], outgoingInternalPaths: [],
    },
    {
      id: 11, type: "post", title: "Pothos watering", slug: "pothos-watering",
      url: "https://houseplantlab.co.uk/pothos-watering/", path: "/pothos-watering/",
      modifiedAt: "2026-10-10T18:00:00.000Z", categoryIds: [1], outgoingInternalPaths: [],
    },
  ],
  brokenInternalPaths: [], orphanPaths: [], categoryNames: ["Plant care"],
};

test("ranking opportunities prefer measured striking-distance pages and exclude unknown URLs", () => {
  const performance = buildSearchPerformanceSnapshot(
    "sc-domain:houseplantlab.co.uk", "2026-09-10", "2026-10-07", "2026-10-10T20:00:00.000Z",
    [
      { keys: ["https://houseplantlab.co.uk/pothos-watering/", "water pothos"], clicks: 5, impressions: 150, ctr: 5 / 150, position: 7.2 },
      { keys: ["https://houseplantlab.co.uk/monstera-drooping/", "monstera drooping"], clicks: 2, impressions: 90, ctr: 2 / 90, position: 13.4 },
      { keys: ["https://houseplantlab.co.uk/invented/", "invented"], clicks: 0, impressions: 500, ctr: 0, position: 11 },
    ],
  );
  const opportunities = buildRankingOpportunities(inventory, performance);
  assert.deepEqual(opportunities.map((item) => item.path), ["/monstera-drooping/", "/pothos-watering/"]);
  assert.equal(opportunities[0]?.opportunity, "striking-distance");
  assert.deepEqual(buildStrongSourcePages(inventory, performance).map((item) => item.path), [
    "/pothos-watering/", "/monstera-drooping/",
  ]);
});
