import {
  SearchPerformanceSnapshotSchema,
  type SearchPerformanceRow,
  type SearchPerformanceSnapshot,
} from "./schemas.js";

interface SearchConsoleApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export interface SearchConsoleDependencies {
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  now?: () => Date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function aggregatePages(rows: SearchPerformanceRow[]): SearchPerformanceSnapshot["topPerformingPages"] {
  const pages = new Map<string, { clicks: number; impressions: number; weightedPosition: number }>();
  for (const row of rows) {
    const current = pages.get(row.page) ?? { clicks: 0, impressions: 0, weightedPosition: 0 };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.weightedPosition += row.position * row.impressions;
    pages.set(row.page, current);
  }
  return [...pages.entries()].map(([page, values]) => ({
    page,
    clicks: values.clicks,
    impressions: values.impressions,
    ctr: values.impressions ? values.clicks / values.impressions : 0,
    averagePosition: values.impressions ? values.weightedPosition / values.impressions : 100,
  })).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 20);
}

export function buildSearchPerformanceSnapshot(
  siteUrl: string,
  startDate: string,
  endDate: string,
  capturedAt: string,
  apiRows: SearchConsoleApiRow[],
): SearchPerformanceSnapshot {
  const rows = apiRows.flatMap((row): SearchPerformanceRow[] => {
    const [page, query] = row.keys ?? [];
    if (!page || !query || !row.position || row.impressions === undefined || row.clicks === undefined || row.ctr === undefined) return [];
    return [{ page, query, clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position }];
  });
  return SearchPerformanceSnapshotSchema.parse({
    siteUrl,
    startDate,
    endDate,
    capturedAt,
    rows,
    topPerformingPages: aggregatePages(rows),
    strikingDistanceQueries: rows
      .filter((row) => row.position > 10 && row.position <= 20)
      .sort((a, b) => b.impressions - a.impressions || a.position - b.position)
      .slice(0, 50),
  });
}

export async function fetchSearchPerformance(dependencies: SearchConsoleDependencies = {}): Promise<SearchPerformanceSnapshot> {
  const env = dependencies.env ?? process.env;
  const clientId = env.GSC_CLIENT_ID?.trim();
  const clientSecret = env.GSC_CLIENT_SECRET?.trim();
  const refreshToken = env.GSC_REFRESH_TOKEN?.trim();
  const siteUrl = env.GSC_SITE_URL?.trim();
  if (!clientId || !clientSecret || !refreshToken || !siteUrl) {
    throw new Error("GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN and GSC_SITE_URL are required for Search Console data.");
  }
  const request = dependencies.fetch ?? fetch;
  const tokenResponse = await request("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!tokenResponse.ok) throw new Error(`Google OAuth token request failed with HTTP ${tokenResponse.status}.`);
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error("Google OAuth response did not include an access token.");

  const now = dependencies.now?.() ?? new Date();
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const startDate = isoDate(start);
  const endDate = isoDate(end);
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const analyticsResponse = await request(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions: ["page", "query"], rowLimit: 25000, dataState: "final" }),
  });
  if (!analyticsResponse.ok) throw new Error(`Search Console analytics request failed with HTTP ${analyticsResponse.status}.`);
  const data = await analyticsResponse.json() as { rows?: SearchConsoleApiRow[] };
  return buildSearchPerformanceSnapshot(siteUrl, startDate, endDate, now.toISOString(), data.rows ?? []);
}
