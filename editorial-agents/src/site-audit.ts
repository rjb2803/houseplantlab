import {
  SiteInventorySchema,
  type SiteInventory,
} from "./schemas.js";

const ORIGIN = "https://houseplantlab.co.uk";

interface WordPressItem {
  id: number;
  slug: string;
  link: string;
  modified_gmt: string;
  title: { rendered: string };
  content: { rendered: string };
  categories?: number[];
}

function canonicalPath(value: string): string | null {
  try {
    const url = new URL(value.replaceAll("&amp;", "&"), ORIGIN);
    if (!["houseplantlab.co.uk", "www.houseplantlab.co.uk"].includes(url.hostname)) return null;
    let pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (!pathname.endsWith("/")) pathname += "/";
    return pathname;
  } catch {
    return null;
  }
}

function internalLinks(html: string): string[] {
  const paths = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => canonicalPath(match[1]))
    .filter((value): value is string => Boolean(value))
    .filter((value) => !/^\/(?:wp-admin|wp-content|wp-json)(?:\/|$)|^\/wp-login\.php\/$/.test(value));
  return [...new Set(paths)].sort();
}

async function fetchCollection(
  endpoint: string,
  type: "post" | "page" | "plant",
  request: typeof fetch,
  auditToken: string,
): Promise<SiteInventory["pages"]> {
  const response = await request(`${ORIGIN}/wp-json/wp/v2/${endpoint}?status=publish&per_page=100&_fields=id,slug,link,modified_gmt,title,content,categories&hpl_audit=${encodeURIComponent(auditToken)}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`WordPress ${type} inventory request failed with HTTP ${response.status}.`);
  const items = await response.json() as WordPressItem[];
  return items.map((item) => {
    const pagePath = canonicalPath(item.link);
    if (!pagePath) throw new Error(`WordPress returned an invalid HouseplantLab URL for item ${item.id}.`);
    return {
      id: item.id,
      type,
      title: item.title.rendered.replace(/<[^>]+>/g, "").trim() || item.slug,
      slug: item.slug,
      url: new URL(pagePath, ORIGIN).toString(),
      path: pagePath,
      modifiedAt: new Date(`${item.modified_gmt}Z`).toISOString(),
      categoryIds: item.categories ?? [],
      outgoingInternalPaths: internalLinks(item.content.rendered).filter((path) => path !== pagePath),
    };
  });
}

async function fetchLiveHubs(request: typeof fetch, now: Date): Promise<SiteInventory["pages"]> {
  const candidates = [
    { slug: "plants", title: "Plant profiles", path: "/plants/" },
    { slug: "blog", title: "The Field Journal", path: "/blog/" },
    { slug: "problem", title: "Plant problems", path: "/problem/" },
    { slug: "tools", title: "Plant tools", path: "/tools/" },
  ];
  const hubs = await Promise.all(candidates.map(async (candidate) => {
    const response = await request(`${ORIGIN}${candidate.path}?hpl-audit=hub`, { redirect: "error" });
    if (!response.ok || !(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) return null;
    const html = await response.text();
    return {
      id: 0,
      type: "hub" as const,
      title: candidate.title,
      slug: candidate.slug,
      url: new URL(candidate.path, ORIGIN).toString(),
      path: candidate.path,
      modifiedAt: now.toISOString(),
      categoryIds: [],
      outgoingInternalPaths: internalLinks(html).filter((pagePath) => pagePath !== "/" && pagePath !== candidate.path),
    };
  }));
  return hubs.filter((hub): hub is NonNullable<typeof hub> => Boolean(hub));
}

export async function auditLiveSite(request: typeof fetch = fetch, now: Date = new Date()): Promise<SiteInventory> {
  const auditToken = now.toISOString();
  const [posts, pages, plants, hubs, categoryResponse] = await Promise.all([
    fetchCollection("posts", "post", request, auditToken),
    fetchCollection("pages", "page", request, auditToken),
    fetchCollection("plant", "plant", request, auditToken),
    fetchLiveHubs(request, now),
    request(`${ORIGIN}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug`),
  ]);
  if (!categoryResponse.ok) throw new Error(`WordPress category inventory request failed with HTTP ${categoryResponse.status}.`);
  const categories = await categoryResponse.json() as Array<{ name: string }>;
  const inventoryPages = [...posts, ...pages, ...plants, ...hubs].sort((a, b) => a.path.localeCompare(b.path));
  const knownPaths = new Set(inventoryPages.map((page) => page.path));
  const allOutgoing = inventoryPages.flatMap((page) => page.outgoingInternalPaths);
  const brokenInternalPaths = [...new Set(allOutgoing.filter((path) => path !== "/" && !knownPaths.has(path)))].sort();
  const linkedPaths = new Set(allOutgoing);
  const hubPaths = new Set(["/plants/", "/blog/", "/problem/", "/tools/"]);
  const orphanPaths = inventoryPages
    .filter((page) => !hubPaths.has(page.path) && !linkedPaths.has(page.path))
    .map((page) => page.path)
    .sort();

  return SiteInventorySchema.parse({
    auditedAt: now.toISOString(),
    origin: ORIGIN,
    pages: inventoryPages,
    brokenInternalPaths,
    orphanPaths,
    categoryNames: categories.map((category) => category.name).sort(),
  });
}
