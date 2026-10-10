import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { run } from "@openai/agents";
import { internalLinkStrategistAgent, siteArchitectAgent } from "./agents.js";
import { auditLiveSite } from "./site-audit.js";
import {
  InternalLinkStrategySchema,
  SiteArchitectureReportSchema,
  type InternalLinkStrategy,
  type SiteArchitectureReport,
  type SiteInventory,
} from "./schemas.js";

export interface InternalLinkStrategyDependencies {
  now?: () => Date;
  inventory?: () => Promise<SiteInventory>;
  architecture?: (input: string) => Promise<SiteArchitectureReport>;
  strategy?: (input: string) => Promise<InternalLinkStrategy>;
  fetch?: typeof fetch;
}

export interface InternalLinkStrategyResult {
  outcome: "strategy-ready";
  assessedPostCount: number;
  clusterCount: number;
  priorityActionCount: number;
  strategyPath: string;
  markdownPath: string;
  message: string;
}

async function defaultArchitecture(input: string): Promise<SiteArchitectureReport> {
  const result = await run(siteArchitectAgent, input);
  if (!result.finalOutput) throw new Error("Site Architect completed without a report.");
  return SiteArchitectureReportSchema.parse(result.finalOutput);
}

async function defaultStrategy(input: string): Promise<InternalLinkStrategy> {
  const result = await run(internalLinkStrategistAgent, input);
  if (!result.finalOutput) throw new Error("Internal Linking Strategist completed without a strategy.");
  return InternalLinkStrategySchema.parse(result.finalOutput);
}

function validateStrategy(strategy: InternalLinkStrategy, inventory: SiteInventory): InternalLinkStrategy {
  const knownPaths = new Set(inventory.pages.map((page) => page.path));
  const brokenPaths = new Set(inventory.brokenInternalPaths);
  const placeholders = new Set(["/hello-world/", "/sample-page/"]);
  const assertKnown = (pagePath: string, context: string): void => {
    if (!knownPaths.has(pagePath) || placeholders.has(pagePath)) {
      throw new Error(`Internal Linking Strategist returned an unknown or placeholder ${context}: ${pagePath}`);
    }
  };

  for (const cluster of strategy.clusters) {
    if (cluster.pillarPath) assertKnown(cluster.pillarPath, "pillar path");
    for (const supportingPath of cluster.supportingPaths) assertKnown(supportingPath, "supporting path");
  }

  const priorities = new Set<number>();
  for (const action of strategy.priorityActions) {
    if (priorities.has(action.priority)) throw new Error(`Duplicate internal-link strategy priority: ${action.priority}`);
    priorities.add(action.priority);
    for (const sourcePath of action.sourcePaths) assertKnown(sourcePath, "source path");
    for (const targetPath of action.targetPaths) {
      if (action.action === "review-broken-link" && brokenPaths.has(targetPath)) continue;
      assertKnown(targetPath, "target path");
    }
    if (["link-orphan", "strengthen-cluster", "add-reciprocal-links"].includes(action.action)
      && (!action.sourcePaths.length || !action.targetPaths.length)) {
      throw new Error(`Action ${action.priority} requires at least one real source and target path.`);
    }
  }
  for (const phase of strategy.rolloutPhases) {
    for (const priority of phase.actionPriorities) {
      if (!priorities.has(priority)) throw new Error(`Rollout phase references unknown action priority ${priority}.`);
    }
  }
  return strategy;
}

function renderMarkdown(
  inventory: SiteInventory,
  architecture: SiteArchitectureReport,
  strategy: InternalLinkStrategy,
): string {
  const lines = [
    "# HouseplantLab internal-linking strategy",
    "",
    `Live inventory audited: ${inventory.auditedAt}`,
    "",
    strategy.summary,
    "",
    "## Strategy principles",
    "",
    ...strategy.principles.map((principle) => `- ${principle}`),
    "",
    "## Topic clusters",
    "",
  ];
  for (const cluster of strategy.clusters) {
    lines.push(`### ${cluster.name}`, "", cluster.readerIntent, "");
    lines.push(`- Pillar: ${cluster.pillarPath ?? "No suitable live pillar yet"}`);
    if (cluster.supportingPaths.length) lines.push(`- Supporting pages: ${cluster.supportingPaths.join(", ")}`);
    if (cluster.missingHubRecommendation) lines.push(`- Review-only hub recommendation: ${cluster.missingHubRecommendation}`);
    lines.push("");
  }
  lines.push("## Prioritised actions", "");
  for (const action of [...strategy.priorityActions].sort((a, b) => a.priority - b.priority)) {
    lines.push(`### ${action.priority}. ${action.action}`, "", action.reason, "");
    if (action.sourcePaths.length) lines.push(`- Link from: ${action.sourcePaths.join(", ")}`);
    if (action.targetPaths.length) lines.push(`- Link to: ${action.targetPaths.join(", ")}`);
    lines.push("");
  }
  lines.push("## Rollout", "");
  for (const phase of [...strategy.rolloutPhases].sort((a, b) => a.phase - b.phase)) {
    lines.push(`- **Phase ${phase.phase}: ${phase.name}.** ${phase.objective} Actions: ${phase.actionPriorities.join(", ")}.`);
  }
  lines.push("", "## Measurement", "", ...strategy.measurements.map((item) => `- ${item}`));
  lines.push("", "## Current architecture warnings", "");
  for (const broken of architecture.brokenLinkFixes) lines.push(`- Broken path ${broken.brokenPath}: ${broken.action}`);
  for (const action of architecture.categoryActions) lines.push(`- ${action}`);
  lines.push("", "## Human review gates", "", ...strategy.requiredHumanChecks.map((item) => `- ${item}`), "");
  return `${lines.join("\n").trimEnd()}\n`;
}

export async function runInternalLinkStrategyWorkflow(
  projectRoot: string,
  dependencies: InternalLinkStrategyDependencies = {},
): Promise<InternalLinkStrategyResult> {
  const now = dependencies.now?.() ?? new Date();
  const request = dependencies.fetch ?? fetch;
  const inventory = await (dependencies.inventory ?? (() => auditLiveSite(request, now)))();
  const createArchitecture = dependencies.architecture ?? defaultArchitecture;
  const architecture = SiteArchitectureReportSchema.parse(await createArchitecture(
    `Audit this live site inventory for internal-link architecture. Return only the structured report.\n${JSON.stringify(inventory, null, 2)}`,
  ));
  const createStrategy = dependencies.strategy ?? defaultStrategy;
  const strategy = validateStrategy(InternalLinkStrategySchema.parse(await createStrategy([
    "Create the site-wide internal-linking strategy from the live inventory and architecture report.",
    "LIVE INVENTORY", JSON.stringify(inventory, null, 2),
    "ARCHITECTURE REPORT", JSON.stringify(architecture, null, 2),
  ].join("\n"))), inventory);

  const runId = now.toISOString().replace(/[:.]/g, "-");
  const runDirectory = path.join(projectRoot, "content-production", "internal-links", "runs", runId);
  const strategyDirectory = path.join(projectRoot, "content-production", "internal-links", "strategy");
  await Promise.all([mkdir(runDirectory, { recursive: true }), mkdir(strategyDirectory, { recursive: true })]);
  const payload = { inventory, architecture, strategy };
  const markdown = renderMarkdown(inventory, architecture, strategy);
  const runJsonPath = path.join(runDirectory, "interlinking-strategy.json");
  const latestJsonPath = path.join(strategyDirectory, "latest.json");
  const latestMarkdownPath = path.join(strategyDirectory, "latest.md");
  await Promise.all([
    writeFile(runJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8"),
    writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8"),
    writeFile(latestMarkdownPath, markdown, "utf8"),
  ]);
  const relative = (filePath: string): string => path.relative(projectRoot, filePath).replaceAll("\\", "/");
  return {
    outcome: "strategy-ready",
    assessedPostCount: inventory.pages.filter((page) => page.type === "post").length,
    clusterCount: strategy.clusters.length,
    priorityActionCount: strategy.priorityActions.length,
    strategyPath: relative(latestJsonPath),
    markdownPath: relative(latestMarkdownPath),
    message: "A validated site-wide internal-linking strategy is ready for the guarded link editor.",
  };
}
