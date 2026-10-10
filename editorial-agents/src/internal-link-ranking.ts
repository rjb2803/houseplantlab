import { buildSearchPerformanceSnapshot, fetchSearchPerformance } from "./search-console.js";
import type { SearchPerformanceSnapshot, SiteInventory } from "./schemas.js";

export interface RankingOpportunity {
  path: string;
  title: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  opportunity: "page-one-growth" | "striking-distance";
}

export interface StrongSourcePage {
  path: string;
  title: string;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
}

function normalisePath(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    if (!["houseplantlab.co.uk", "www.houseplantlab.co.uk"].includes(url.hostname)) return null;
    return url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  } catch {
    return null;
  }
}

export function buildRankingOpportunities(
  inventory: SiteInventory,
  performance: SearchPerformanceSnapshot,
): RankingOpportunity[] {
  const pages = new Map(inventory.pages.map((page) => [page.path, page]));
  const bestByPath = new Map<string, RankingOpportunity>();
  for (const row of performance.rows) {
    if (row.position < 5 || row.position > 20 || row.impressions <= 0) continue;
    const pagePath = normalisePath(row.page);
    const page = pagePath ? pages.get(pagePath) : undefined;
    if (!page || ["hello-world", "sample-page"].includes(page.slug)) continue;
    const candidate: RankingOpportunity = {
      path: page.path,
      title: page.title,
      query: row.query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      opportunity: row.position > 10 ? "striking-distance" : "page-one-growth",
    };
    const current = bestByPath.get(page.path);
    if (!current || candidate.impressions > current.impressions
      || (candidate.impressions === current.impressions && candidate.position < current.position)) {
      bestByPath.set(page.path, candidate);
    }
  }
  return [...bestByPath.values()].sort((a, b) => {
    const tier = (value: RankingOpportunity): number => value.opportunity === "striking-distance" ? 0 : 1;
    return tier(a) - tier(b) || b.impressions - a.impressions || a.position - b.position;
  });
}

export function buildStrongSourcePages(
  inventory: SiteInventory,
  performance: SearchPerformanceSnapshot,
): StrongSourcePage[] {
  const pages = new Map(inventory.pages.map((page) => [page.path, page]));
  return performance.topPerformingPages.flatMap((metrics): StrongSourcePage[] => {
    const pagePath = normalisePath(metrics.page);
    const page = pagePath ? pages.get(pagePath) : undefined;
    if (!page || metrics.impressions <= 0 || ["hello-world", "sample-page"].includes(page.slug)) return [];
    return [{ path: page.path, title: page.title, ...metrics }];
  });
}

export async function resolveSearchPerformance(
  now: Date,
  dependencies: { env?: NodeJS.ProcessEnv; fetch?: typeof fetch } = {},
): Promise<SearchPerformanceSnapshot> {
  const env = dependencies.env ?? process.env;
  const keys = [env.GSC_CLIENT_ID, env.GSC_CLIENT_SECRET, env.GSC_REFRESH_TOKEN, env.GSC_SITE_URL];
  const configuredCount = keys.filter((value) => value?.trim()).length;
  if (configuredCount > 0 && configuredCount < keys.length) {
    throw new Error("Search Console configuration is incomplete; set all four GSC environment values or none of them.");
  }
  if (configuredCount === keys.length) {
    return fetchSearchPerformance({ now: () => now, env, fetch: dependencies.fetch });
  }
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return buildSearchPerformanceSnapshot(
    "sc-domain:houseplantlab.co.uk",
    start.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
    now.toISOString(),
    [],
  );
}
