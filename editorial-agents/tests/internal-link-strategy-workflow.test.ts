import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runInternalLinkStrategyWorkflow } from "../src/internal-link-strategy-workflow.js";
import type { InternalLinkStrategy, SiteArchitectureReport, SiteInventory } from "../src/schemas.js";

const inventory: SiteInventory = {
  auditedAt: "2026-10-10T19:00:00.000Z",
  origin: "https://houseplantlab.co.uk",
  pages: [
    {
      id: 6, type: "plant", title: "Monstera deliciosa", slug: "monstera-deliciosa",
      url: "https://houseplantlab.co.uk/plants/monstera-deliciosa/", path: "/plants/monstera-deliciosa/",
      modifiedAt: "2026-10-10T18:00:00.000Z", categoryIds: [], outgoingInternalPaths: [],
    },
    {
      id: 11, type: "post", title: "Why is my Monstera drooping?", slug: "why-is-my-monstera-drooping",
      url: "https://houseplantlab.co.uk/why-is-my-monstera-drooping/", path: "/why-is-my-monstera-drooping/",
      modifiedAt: "2026-10-10T18:00:00.000Z", categoryIds: [1], outgoingInternalPaths: [],
    },
  ],
  brokenInternalPaths: [],
  orphanPaths: ["/why-is-my-monstera-drooping/"],
  categoryNames: ["Uncategorized"],
};

const architecture: SiteArchitectureReport = {
  summary: "The Monstera profile should act as the pillar for its connected care and diagnostic guidance.",
  requiredHubs: [],
  orphanFixes: [{
    orphanPath: "/why-is-my-monstera-drooping/", action: "add-internal-links",
    linkFromPaths: ["/plants/monstera-deliciosa/"], reason: "The profile is the natural discovery route.",
  }],
  brokenLinkFixes: [],
  categoryActions: ["Review the Uncategorized default before changing taxonomy."],
  requiredHumanChecks: ["Review the proposed cluster and any taxonomy changes before implementation."],
};

const strategy: InternalLinkStrategy = {
  summary: "Build a small Monstera cluster around the existing plant profile, rescuing the orphan diagnostic article with reciprocal links.",
  principles: [
    "Link only where the next page answers a natural reader question.",
    "Use the plant profile as the cluster pillar when it already exists.",
    "Keep taxonomy and URL changes behind explicit human review.",
  ],
  clusters: [{
    clusterId: "monstera-care", name: "Monstera care", readerIntent: "Understand the plant and diagnose common care problems.",
    pillarPath: "/plants/monstera-deliciosa/", supportingPaths: ["/why-is-my-monstera-drooping/"],
    missingHubRecommendation: null,
  }],
  priorityActions: [{
    priority: 1, action: "add-reciprocal-links", sourcePaths: ["/plants/monstera-deliciosa/"],
    targetPaths: ["/why-is-my-monstera-drooping/"], reason: "Connect the pillar to the orphan diagnostic and provide a clear route back.",
  }],
  rolloutPhases: [{ phase: 1, name: "Orphan rescue", objective: "Connect the existing Monstera diagnostic to its natural pillar.", actionPriorities: [1] }],
  measurements: ["Reduce genuine orphan posts to zero.", "Track cluster pages with reciprocal relevant links.", "Monitor broken internal paths after every run."],
  requiredHumanChecks: ["Review all proposed navigation, taxonomy and URL changes separately before implementation."],
};

test("interlinking strategy workflow writes validated JSON and readable Markdown", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-link-strategy-"));
  try {
    const result = await runInternalLinkStrategyWorkflow(root, {
      inventory: async () => inventory,
      architecture: async () => architecture,
      strategy: async () => strategy,
      now: () => new Date("2026-10-10T19:00:00.000Z"),
    });
    assert.equal(result.outcome, "strategy-ready");
    assert.equal(result.clusterCount, 1);
    const markdown = await readFile(path.join(root, result.markdownPath), "utf8");
    assert.match(markdown, /## Topic clusters/);
    assert.match(markdown, /\/plants\/monstera-deliciosa\//);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("interlinking strategy rejects invented live paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-link-strategy-"));
  try {
    await assert.rejects(runInternalLinkStrategyWorkflow(root, {
      inventory: async () => inventory,
      architecture: async () => architecture,
      strategy: async () => ({
        ...strategy,
        clusters: [{ ...strategy.clusters[0], supportingPaths: ["/invented-guide/"] }],
      }),
    }), /unknown or placeholder supporting path/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
