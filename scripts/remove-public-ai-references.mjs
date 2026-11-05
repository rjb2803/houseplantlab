const apply = process.argv.includes("--apply");
const siteUrl = process.env.WP_SITE_URL?.trim();
const username = process.env.WP_USERNAME?.trim();
const appPassword = process.env.WP_APP_PASSWORD?.trim();

if (!siteUrl || !username || !appPassword) {
  throw new Error("WP_SITE_URL, WP_USERNAME and WP_APP_PASSWORD are required.");
}

const origin = new URL(siteUrl);
if (origin.protocol !== "https:" || origin.port || origin.username || origin.password
  || !["houseplantlab.co.uk", "www.houseplantlab.co.uk"].includes(origin.hostname)) {
  throw new Error("WP_SITE_URL must be the HTTPS HouseplantLab production origin.");
}

const authorization = `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`;
const publicReferencePattern = /\b(?:AI[- ]generated|generated (?:by|with) AI|artificial intelligence|editorial illustration)\b/gi;

function neutralise(value) {
  return value
    .replace(/\bHouseplantLab editorial illustration for\b/gi, "HouseplantLab image for")
    .replace(/\bEditorial illustration of\b/gi, "Image of")
    .replace(/\bEditorial illustration for\b/gi, "Image for")
    .replace(/\beditorial illustration\b/gi, "image")
    .replace(/\bAI[- ]generated(?: image| illustration)?\b/gi, "image")
    .replace(/\bgenerated (?:by|with) AI\b/gi, "created digitally")
    .replace(/\bartificial intelligence\b/gi, "digital tools");
}

async function responseError(response, action) {
  let detail = "";
  try {
    const body = await response.json();
    if (body.message) detail = ` ${body.message}`;
  } catch {
    // The HTTP status is enough when WordPress returns HTML.
  }
  return new Error(`${action} failed with HTTP ${response.status}.${detail}`);
}

async function fetchMedia() {
  const media = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = new URL("/wp-json/wp/v2/media", origin);
    url.searchParams.set("context", "edit");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("_fields", "id,link,caption,description,alt_text");
    const response = await fetch(url, { headers: { Authorization: authorization }, redirect: "error" });
    if (!response.ok) throw await responseError(response, "WordPress media inventory");
    media.push(...await response.json());
    totalPages = Number.parseInt(response.headers.get("x-wp-totalpages") ?? "1", 10) || 1;
    page += 1;
  } while (page <= totalPages);
  return media;
}

const changes = [];
for (const item of await fetchMedia()) {
  const caption = item.caption?.raw ?? "";
  const description = item.description?.raw ?? "";
  const altText = item.alt_text ?? "";
  if (!publicReferencePattern.test(`${caption}\n${description}\n${altText}`)) continue;
  publicReferencePattern.lastIndex = 0;
  changes.push({
    id: item.id,
    link: item.link,
    caption: neutralise(caption),
    description: neutralise(description),
    altText: neutralise(altText),
  });
}

if (apply) {
  for (const change of changes) {
    const response = await fetch(new URL(`/wp-json/wp/v2/media/${change.id}`, origin), {
      method: "POST",
      redirect: "error",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ caption: change.caption, description: change.description, alt_text: change.altText }),
    });
    if (!response.ok) throw await responseError(response, `WordPress media update ${change.id}`);
    const updated = await response.json();
    const rendered = `${updated.caption?.rendered ?? ""}\n${updated.description?.rendered ?? ""}\n${updated.alt_text ?? ""}`;
    publicReferencePattern.lastIndex = 0;
    if (publicReferencePattern.test(rendered)) {
      throw new Error(`WordPress media ${change.id} still exposes production-method wording after update.`);
    }
  }
}

console.log(JSON.stringify({
  outcome: apply ? "updated" : "dry-run",
  matchingMediaCount: changes.length,
  updatedMediaCount: apply ? changes.length : 0,
  ids: changes.map((change) => change.id),
}, null, 2));
