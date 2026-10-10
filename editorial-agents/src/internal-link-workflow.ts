import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { run } from "@openai/agents";
import { z } from "zod";
import { internalLinkAgent } from "./agents.js";
import {
  buildRankingOpportunities,
  buildStrongSourcePages,
  resolveSearchPerformance,
  type RankingOpportunity,
  type StrongSourcePage,
} from "./internal-link-ranking.js";
import { auditLiveSite } from "./site-audit.js";
import {
  InternalLinkPlanSchema,
  InternalLinkStrategySchema,
  type InternalLinkPlan,
  type InternalLinkStrategy,
  type SearchPerformanceSnapshot,
  type SiteInventory,
} from "./schemas.js";

const ORIGIN = "https://houseplantlab.co.uk";
const EditablePostSchema = z.object({
  id: z.number().int().positive(),
  content: z.object({ raw: z.string(), rendered: z.string().optional() }),
});

const UpdatedPostSchema = z.object({
  id: z.number().int().positive(),
  content: z.object({ rendered: z.string() }),
});

export interface InternalLinkWorkflowDependencies {
  now?: () => Date;
  inventory?: () => Promise<SiteInventory>;
  postApplyInventory?: () => Promise<SiteInventory>;
  plan?: (input: string) => Promise<InternalLinkPlan>;
  performance?: () => Promise<SearchPerformanceSnapshot>;
  strategy?: InternalLinkStrategy | null;
  fetch?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}

export interface InternalLinkWorkflowResult {
  outcome: "report-ready" | "links-applied" | "no-safe-updates";
  reportPath: string;
  assessedPostCount: number;
  updatedPostCount: number;
  updatedPaths: string[];
  rankingOpportunityCount: number;
  strongSourceCount: number;
  searchPerformanceState: "measured" | "not-configured";
  orphanCountBefore: number;
  orphanCountAfter: number;
  articlesBelowMinimumBefore: number;
  articlesBelowMinimumAfter: number;
  message: string;
}

interface LinkCoverage {
  orphanPaths: string[];
  belowMinimumPaths: Array<{ path: string; currentLinks: number; linksNeeded: number }>;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function productionCredentials(env: NodeJS.ProcessEnv): { authorization: string } {
  const siteUrl = env.WP_SITE_URL?.trim();
  const username = env.WP_USERNAME?.trim();
  const appPassword = env.WP_APP_PASSWORD?.trim();
  if (!siteUrl || !username || !appPassword) {
    throw new Error("WP_SITE_URL, WP_USERNAME and WP_APP_PASSWORD are required to apply internal links.");
  }
  const origin = new URL(siteUrl);
  if (origin.protocol !== "https:" || origin.port || origin.username || origin.password
    || !["houseplantlab.co.uk", "www.houseplantlab.co.uk"].includes(origin.hostname)) {
    throw new Error("WP_SITE_URL must be the HTTPS HouseplantLab production origin.");
  }
  return { authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}` };
}

function plantFamily(pagePath: string): string | null {
  if (pagePath.includes("monstera")) return "monstera-deliciosa";
  const families = [
    "peace-lily", "snake-plant", "spider-plant", "pothos",
    "phalaenopsis-orchid", "fiddle-leaf-fig", "rubber-plant", "calathea", "aloe-vera", "zz-plant",
  ];
  return families.find((family) => pagePath.includes(family)) ?? (pagePath.includes("orchid") ? "phalaenopsis-orchid" : null);
}

function assessLinkCoverage(inventory: SiteInventory): LinkCoverage {
  const placeholders = new Set(["/hello-world/", "/sample-page/"]);
  const knownPaths = new Set(inventory.pages.map((page) => page.path));
  const genuinePosts = inventory.pages.filter((page) => page.type === "post" && !placeholders.has(page.path));
  return {
    orphanPaths: inventory.orphanPaths.filter((pagePath) => !placeholders.has(pagePath)),
    belowMinimumPaths: genuinePosts.flatMap((page) => {
      const currentLinks = new Set(page.outgoingInternalPaths.filter((target) =>
        target !== page.path && knownPaths.has(target) && !placeholders.has(target),
      )).size;
      return currentLinks >= 3 ? [] : [{ path: page.path, currentLinks, linksNeeded: 3 - currentLinks }];
    }),
  };
}

async function defaultPlan(input: string): Promise<InternalLinkPlan> {
  const result = await run(internalLinkAgent, input);
  if (!result.finalOutput) throw new Error("Internal Link Editor completed without a plan.");
  return InternalLinkPlanSchema.parse(result.finalOutput);
}

async function readLatestStrategy(projectRoot: string): Promise<InternalLinkStrategy | null> {
  const strategyPath = path.join(projectRoot, "content-production", "internal-links", "strategy", "latest.json");
  try {
    const payload = JSON.parse(await readFile(strategyPath, "utf8")) as { strategy?: unknown };
    return InternalLinkStrategySchema.parse(payload.strategy);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function validatePlan(plan: InternalLinkPlan, inventory: SiteInventory): InternalLinkPlan {
  const byPath = new Map(inventory.pages.map((page) => [page.path, page]));
  const byId = new Map(inventory.pages.filter((page) => page.type === "post").map((page) => [page.id, page]));
  const placeholders = new Set(["/hello-world/", "/sample-page/"]);
  const sourceIds = new Set<number>();

  const recommendations: InternalLinkPlan["recommendations"] = [];
  for (const recommendation of plan.recommendations) {
    const source = byId.get(recommendation.sourcePostId);
    if (!source || source.path !== recommendation.sourcePath || sourceIds.has(source.id)) continue;
    sourceIds.add(source.id);
    const targets = new Set<string>();
    const links: typeof recommendation.links = [];
    const sourceFamily = plantFamily(source.path);
    for (const link of recommendation.links) {
      if (!byPath.has(link.targetPath) || placeholders.has(link.targetPath)) continue;
      if (link.targetPath === source.path) continue;
      if (source.outgoingInternalPaths.includes(link.targetPath) || targets.has(link.targetPath)) continue;
      const targetFamily = plantFamily(link.targetPath);
      if (sourceFamily && targetFamily && sourceFamily !== targetFamily) continue;
      if (sourceFamily && !targetFamily && ["/blog/", "/plants/"].includes(link.targetPath)) continue;
      if (/[<>]/u.test(link.anchorLabel)) throw new Error("Internal-link labels must be plain text.");
      targets.add(link.targetPath);
      links.push(link);
    }
    if (links.length) recommendations.push({ ...recommendation, links });
  }
  return { ...plan, recommendations };
}

function markerId(targetPath: string): string {
  return targetPath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

function contextualLinkParagraph(link: InternalLinkPlan["recommendations"][number]["links"][number]): string {
  const [before, after] = link.contextSentence.split("{anchor}");
  const id = markerId(link.targetPath);
  return [
    `<!-- hpl-contextual-link:${id}:start -->`,
    `<p class="hpl-contextual-link">${escapeHtml(before ?? "")}<a href="${escapeHtml(link.targetPath)}">${escapeHtml(link.anchorLabel)}</a>${escapeHtml(after ?? "")}</p>`,
    `<!-- hpl-contextual-link:${id}:end -->`,
  ].join("\n");
}

function insertContextualLinks(
  rawContent: string,
  links: InternalLinkPlan["recommendations"][number]["links"],
): string {
  const additions = links
    .filter((link) => !rawContent.includes(`hpl-contextual-link:${markerId(link.targetPath)}:start`))
    .map(contextualLinkParagraph);
  if (!additions.length) return rawContent;
  const block = additions.join("\n\n");
  const summaryPatterns = [/<h[23][^>]*>\s*In summary\s*<\/h[23]>/i, /^#{2,3}\s+In summary\s*$/im];
  const insertionIndexes = summaryPatterns
    .map((pattern) => pattern.exec(rawContent)?.index)
    .filter((value): value is number => value !== undefined);
  const insertionIndex = insertionIndexes.length ? Math.min(...insertionIndexes) : rawContent.length;
  return `${rawContent.slice(0, insertionIndex).trimEnd()}\n\n${block}\n\n${rawContent.slice(insertionIndex).trimStart()}`.trimEnd() + "\n";
}

function prioritisePlan(
  plan: InternalLinkPlan,
  opportunities: RankingOpportunity[],
  strongSources: StrongSourcePage[],
  orphanPaths: string[],
): InternalLinkPlan {
  const rank = new Map(opportunities.map((opportunity, index) => [opportunity.path, index]));
  const sourceRank = new Map(strongSources.map((source, index) => [source.path, index]));
  const orphans = new Set(orphanPaths);
  const recommendations = [...plan.recommendations].sort((a, b) => {
    const orphanTargets = (recommendation: typeof a): number =>
      recommendation.links.filter((link) => orphans.has(link.targetPath)).length;
    const bestRank = (recommendation: typeof a): number => Math.min(
      ...recommendation.links.map((link) => rank.get(link.targetPath) ?? Number.MAX_SAFE_INTEGER),
      rank.get(recommendation.sourcePath) ?? Number.MAX_SAFE_INTEGER,
    );
    return orphanTargets(b) - orphanTargets(a)
      || bestRank(a) - bestRank(b)
      || (sourceRank.get(a.sourcePath) ?? Number.MAX_SAFE_INTEGER)
        - (sourceRank.get(b.sourcePath) ?? Number.MAX_SAFE_INTEGER);
  });
  return { ...plan, recommendations };
}

async function responseError(response: Response, action: string): Promise<Error> {
  let detail = "";
  try {
    const body = await response.json() as { message?: string };
    if (body.message) detail = ` ${body.message}`;
  } catch {
    // The HTTP status still gives a safe diagnostic when WordPress returns HTML.
  }
  return new Error(`${action} failed with HTTP ${response.status}.${detail}`);
}

export async function runInternalLinkWorkflow(
  projectRoot: string,
  options: { apply?: boolean; maxSources?: number } = {},
  dependencies: InternalLinkWorkflowDependencies = {},
): Promise<InternalLinkWorkflowResult> {
  const now = dependencies.now?.() ?? new Date();
  const request = dependencies.fetch ?? fetch;
  const inventory = await (dependencies.inventory ?? (() => auditLiveSite(request, now)))();
  const coverageBefore = assessLinkCoverage(inventory);
  const performance = await (dependencies.performance
    ? dependencies.performance()
    : resolveSearchPerformance(now, { env: dependencies.env ?? process.env, fetch: request }));
  const rankingOpportunities = buildRankingOpportunities(inventory, performance);
  const strongSources = buildStrongSourcePages(inventory, performance);
  const posts = inventory.pages.filter((page) => page.type === "post" && !["hello-world"].includes(page.slug));
  const createPlan = dependencies.plan ?? defaultPlan;
  const strategy = dependencies.strategy === undefined
    ? await readLatestStrategy(projectRoot)
    : dependencies.strategy;
  const plan = prioritisePlan(validatePlan(InternalLinkPlanSchema.parse(await createPlan([
    "Assess every published article in this live inventory and propose only strong missing internal links.",
    "Return only the structured plan. Existing outgoingInternalPaths must never be recommended again.",
    "Coverage policy: every genuine article should have at least three relevant contextual outgoing links. For each source below three, propose only the number of strong missing links needed to reach three, up to the schema maximum. Never force an unrelated link to meet the number.",
    "Orphan policy: every genuine orphan must gain at least one relevant inbound link. Prioritise recommendations whose targetPath is in orphanPaths. An outbound link from an orphan does not rescue that orphan.",
    `CURRENT COVERAGE GAPS\n${JSON.stringify(coverageBefore, null, 2)}`,
    strategy
      ? `Use this validated site-wide strategy as a priority guide, but independently verify every source and target against the current inventory:\n${JSON.stringify(strategy, null, 2)}`
      : "No saved site-wide strategy is available; use the live inventory conservatively.",
    performance.rows.length
      ? `Prioritise genuine ranking opportunities from this measured Search Console snapshot. Positions 11-20 come first, then positions 5-10. Prefer strong relevant source pages for those links. Never infer missing data:\n${JSON.stringify({ performance, rankingOpportunities, strongSources }, null, 2)}`
      : "Search Console is not configured or returned no measured rows. Do not make or imply ranking claims; prioritise relevance and orphan rescue only.",
    JSON.stringify(inventory, null, 2),
  ].join("\n"))), inventory), rankingOpportunities, strongSources, coverageBefore.orphanPaths);

  const runId = now.toISOString().replace(/[:.]/g, "-");
  const outputDirectory = path.join(projectRoot, "content-production", "internal-links", "runs", runId);
  await mkdir(outputDirectory, { recursive: true });
  const reportPath = path.join(outputDirectory, "internal-link-plan.json");
  await writeFile(reportPath, `${JSON.stringify({ inventory, coverageBefore, performance, rankingOpportunities, strongSources, plan }, null, 2)}\n`, "utf8");
  const relativeReportPath = path.relative(projectRoot, reportPath).replaceAll("\\", "/");

  if (!options.apply) {
    return {
      outcome: "report-ready",
      reportPath: relativeReportPath,
      assessedPostCount: posts.length,
      updatedPostCount: 0,
      updatedPaths: [],
      rankingOpportunityCount: rankingOpportunities.length,
      strongSourceCount: strongSources.length,
      searchPerformanceState: performance.rows.length ? "measured" : "not-configured",
      orphanCountBefore: coverageBefore.orphanPaths.length,
      orphanCountAfter: coverageBefore.orphanPaths.length,
      articlesBelowMinimumBefore: coverageBefore.belowMinimumPaths.length,
      articlesBelowMinimumAfter: coverageBefore.belowMinimumPaths.length,
      message: `Internal-link report created for ${posts.length} published articles; no live content was changed.`,
    };
  }

  const { authorization } = productionCredentials(dependencies.env ?? process.env);
  const maxSources = Math.max(1, Math.min(options.maxSources ?? 3, 5));
  const selected = plan.recommendations.slice(0, maxSources);
  const updatedPaths: string[] = [];

  for (const recommendation of selected) {
    const getResponse = await request(`${ORIGIN}/wp-json/wp/v2/posts/${recommendation.sourcePostId}?context=edit`, {
      headers: { Authorization: authorization },
      redirect: "error",
    });
    if (!getResponse.ok) throw await responseError(getResponse, "WordPress internal-link source read");
    const editable = EditablePostSchema.parse(await getResponse.json());
    const nextContent = insertContextualLinks(editable.content.raw, recommendation.links);
    if (nextContent === editable.content.raw) continue;
    const updateResponse = await request(`${ORIGIN}/wp-json/wp/v2/posts/${recommendation.sourcePostId}`, {
      method: "POST",
      redirect: "error",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ content: nextContent }),
    });
    if (!updateResponse.ok) throw await responseError(updateResponse, "WordPress internal-link update");
    const updated = UpdatedPostSchema.parse(await updateResponse.json());
    for (const link of recommendation.links) {
      if (!updated.content.rendered.includes(`href="${link.targetPath}"`)
        && !updated.content.rendered.includes(`href="${ORIGIN}${link.targetPath}"`)) {
        throw new Error(`WordPress did not preserve the approved link to ${link.targetPath}.`);
      }
    }

    const verificationUrl = `${ORIGIN}${recommendation.sourcePath}?hpl-link-verify=${encodeURIComponent(runId)}`;
    const publicResponse = await request(verificationUrl, { redirect: "error" });
    if (!publicResponse.ok) throw await responseError(publicResponse, "Public internal-link verification");
    const publicHtml = await publicResponse.text();
    if (!publicHtml.includes("hpl-contextual-link")) {
      throw new Error(`The public article did not render its contextual link text: ${recommendation.sourcePath}`);
    }
    for (const link of recommendation.links) {
      if (!publicHtml.includes(`href="${link.targetPath}"`)
        && !publicHtml.includes(`href="${ORIGIN}${link.targetPath}"`)) {
        throw new Error(`The public article did not render the approved link to ${link.targetPath}.`);
      }
      const targetResponse = await request(`${ORIGIN}${link.targetPath}?hpl-link-target-verify=${encodeURIComponent(runId)}`, {
        redirect: "error",
      });
      if (!targetResponse.ok) throw await responseError(targetResponse, `Internal-link target verification for ${link.targetPath}`);
    }
    updatedPaths.push(recommendation.sourcePath);
  }

  const inventoryAfter = dependencies.postApplyInventory
    ? await dependencies.postApplyInventory()
    : dependencies.inventory
      ? inventory
      : await auditLiveSite(request, new Date());
  const coverageAfter = assessLinkCoverage(inventoryAfter);
  await writeFile(path.join(outputDirectory, "apply-result.json"), `${JSON.stringify({ updatedPaths, coverageBefore, coverageAfter }, null, 2)}\n`, "utf8");
  return {
    outcome: updatedPaths.length ? "links-applied" : "no-safe-updates",
    reportPath: relativeReportPath,
    assessedPostCount: posts.length,
    updatedPostCount: updatedPaths.length,
    updatedPaths,
    rankingOpportunityCount: rankingOpportunities.length,
    strongSourceCount: strongSources.length,
    searchPerformanceState: performance.rows.length ? "measured" : "not-configured",
    orphanCountBefore: coverageBefore.orphanPaths.length,
    orphanCountAfter: coverageAfter.orphanPaths.length,
    articlesBelowMinimumBefore: coverageBefore.belowMinimumPaths.length,
    articlesBelowMinimumAfter: coverageAfter.belowMinimumPaths.length,
    message: updatedPaths.length
      ? `Added verified contextual text links to ${updatedPaths.length} published articles.`
      : "The audit found no safe unlinked article batch to update.",
  };
}
