import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { run } from "@openai/agents";
import { seoBriefDirectorAgent, siteArchitectAgent } from "./agents.js";
import { auditLiveSite } from "./site-audit.js";
import { fetchSearchPerformance } from "./search-console.js";
import { buildSearchPerformanceSnapshot } from "./search-console.js";
import {
  EditorialQueueSchema,
  SeoContentBriefSchema,
  SiteArchitectureReportSchema,
  type SearchPerformanceSnapshot,
  type SeoContentBrief,
  type SiteArchitectureReport,
  type SiteInventory,
} from "./schemas.js";

export interface SeoWorkflowDependencies {
  now?: () => Date;
  inventory?: () => Promise<SiteInventory>;
  performance?: () => Promise<SearchPerformanceSnapshot>;
  architecture?: (input: string) => Promise<SiteArchitectureReport>;
  brief?: (input: string) => Promise<SeoContentBrief>;
}

export interface SeoWorkflowResult {
  outcome: "brief-ready" | "insufficient-search-data";
  outputDirectory: string;
  briefPath: string | null;
  queuedItemId: string | null;
  message: string;
}

async function defaultArchitecture(input: string): Promise<SiteArchitectureReport> {
  const result = await run(siteArchitectAgent, input);
  if (!result.finalOutput) throw new Error("Site Architect completed without a report.");
  return SiteArchitectureReportSchema.parse(result.finalOutput);
}

async function defaultBrief(input: string): Promise<SeoContentBrief> {
  const result = await run(seoBriefDirectorAgent, input);
  if (!result.finalOutput) throw new Error("SEO Brief Director completed without a brief.");
  return SeoContentBriefSchema.parse(result.finalOutput);
}

async function updateSiteManifest(projectRoot: string, inventory: SiteInventory): Promise<void> {
  const manifestPath = path.join(projectRoot, "content-production", "site-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
  const observedPaths = inventory.pages
    .filter((page) => !["hello-world", "sample-page"].includes(page.slug))
    .map((page) => page.path);
  const existingAllowed = Array.isArray(manifest.allowedInternalPaths) ? manifest.allowedInternalPaths as string[] : [];
  const next = {
    ...manifest,
    existingArticleSlugs: inventory.pages.filter((page) => page.type === "post").map((page) => page.slug).sort(),
    allowedInternalPaths: [...new Set([...existingAllowed, ...observedPaths])].sort(),
    lastLiveAuditAt: inventory.auditedAt,
  };
  const temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporaryPath, manifestPath);
}

async function queueNewArticle(projectRoot: string, brief: SeoContentBrief, briefPath: string, now: Date): Promise<string | null> {
  if (brief.recommendationType !== "new-article") return null;
  const queuePath = path.join(projectRoot, "content-production", "queue", "articles.json");
  let queue = EditorialQueueSchema.parse(JSON.parse(await readFile(queuePath, "utf8")));
  if (queue.items.some((item) => item.id === brief.proposedSlug)) return brief.proposedSlug;
  const highestPriority = queue.items.reduce((maximum, item) => Math.max(maximum, item.priority), 0);
  const timestamp = now.toISOString();
  queue = {
    ...queue,
    items: [...queue.items, {
      id: brief.proposedSlug,
      assignment: brief.writerAssignment,
      plant: brief.plant,
      priority: highestPriority + 1,
      status: "queued" as const,
      attempts: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
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
      seoBriefPath: path.relative(projectRoot, briefPath).replaceAll("\\", "/"),
    }],
  };
  const temporaryPath = `${queuePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  await rename(temporaryPath, queuePath);
  return brief.proposedSlug;
}

export async function runSeoPlanningWorkflow(
  projectRoot: string,
  dependencies: SeoWorkflowDependencies = {},
): Promise<SeoWorkflowResult> {
  const now = dependencies.now?.() ?? new Date();
  const inventory = await (dependencies.inventory ?? (() => auditLiveSite(fetch, now)))();
  let performance: SearchPerformanceSnapshot;
  if (dependencies.performance) {
    performance = await dependencies.performance();
  } else {
    const credentials = [process.env.GSC_CLIENT_ID, process.env.GSC_CLIENT_SECRET, process.env.GSC_REFRESH_TOKEN, process.env.GSC_SITE_URL];
    const configuredCount = credentials.filter((value) => value?.trim()).length;
    if (configuredCount === 0) {
      const end = new Date(now);
      end.setUTCDate(end.getUTCDate() - 3);
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 27);
      performance = buildSearchPerformanceSnapshot(
        "sc-domain:houseplantlab.co.uk",
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
        now.toISOString(),
        [],
      );
    } else if (configuredCount < credentials.length) {
      throw new Error("Search Console configuration is incomplete; set all four GSC environment values or none of them.");
    } else {
      performance = await fetchSearchPerformance({ now: () => now });
    }
  }
  const runId = now.toISOString().replace(/[:.]/g, "-");
  const outputDirectory = path.join(projectRoot, "content-production", "seo", "runs", runId);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "site-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDirectory, "search-performance.json"), `${JSON.stringify(performance, null, 2)}\n`, "utf8");
  await updateSiteManifest(projectRoot, inventory);

  const createArchitecture = dependencies.architecture ?? defaultArchitecture;
  const architecture = SiteArchitectureReportSchema.parse(await createArchitecture(
    `Audit this live site inventory. Return only the structured architecture report.\n${JSON.stringify(inventory, null, 2)}`,
  ));
  for (const fix of architecture.orphanFixes) {
    const placeholder = ["/hello-world/", "/sample-page/"].includes(fix.orphanPath);
    if (placeholder && (fix.action !== "review-placeholder-removal" || fix.linkFromPaths.length)) {
      throw new Error(`Site Architect attempted to promote WordPress placeholder content: ${fix.orphanPath}`);
    }
    if (!placeholder && fix.action === "add-internal-links" && !fix.linkFromPaths.length) {
      throw new Error(`Site Architect omitted source pages for orphan fix: ${fix.orphanPath}`);
    }
  }
  await writeFile(path.join(outputDirectory, "site-architecture-report.json"), `${JSON.stringify(architecture, null, 2)}\n`, "utf8");

  if (!performance.rows.length) {
    return {
      outcome: "insufficient-search-data",
      outputDirectory: path.relative(projectRoot, outputDirectory).replaceAll("\\", "/"),
      briefPath: null,
      queuedItemId: null,
      message: "Site architecture audit completed, but Search Console returned no query rows for the measured window.",
    };
  }

  const createBrief = dependencies.brief ?? defaultBrief;
  const brief = SeoContentBriefSchema.parse(await createBrief([
    "Create the next writer brief from measured search performance and the live site structure.",
    "SEARCH PERFORMANCE", JSON.stringify(performance, null, 2),
    "SITE INVENTORY", JSON.stringify(inventory, null, 2),
    "ARCHITECTURE REPORT", JSON.stringify(architecture, null, 2),
  ].join("\n")));
  const briefPath = path.join(outputDirectory, "next-writer-brief.json");
  await writeFile(briefPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  const queuedItemId = await queueNewArticle(projectRoot, brief, briefPath, now);
  return {
    outcome: "brief-ready",
    outputDirectory: path.relative(projectRoot, outputDirectory).replaceAll("\\", "/"),
    briefPath: path.relative(projectRoot, briefPath).replaceAll("\\", "/"),
    queuedItemId,
    message: queuedItemId
      ? "SEO brief created from measured performance and queued for the editorial writer."
      : "SEO refresh brief created from measured performance and saved for the writer refresh workflow.",
  };
}
