import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { run } from "@openai/agents";
import { z } from "zod";
import { internalLinkAgent } from "./agents.js";
import { auditLiveSite } from "./site-audit.js";
import {
  InternalLinkPlanSchema,
  type InternalLinkPlan,
  type SiteInventory,
} from "./schemas.js";

const ORIGIN = "https://houseplantlab.co.uk";
const BLOCK_START = "<!-- hpl-internal-links:start -->";
const BLOCK_END = "<!-- hpl-internal-links:end -->";

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
  plan?: (input: string) => Promise<InternalLinkPlan>;
  fetch?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}

export interface InternalLinkWorkflowResult {
  outcome: "report-ready" | "links-applied" | "no-safe-updates";
  reportPath: string;
  assessedPostCount: number;
  updatedPostCount: number;
  updatedPaths: string[];
  message: string;
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
  const families = [
    "monstera-deliciosa", "peace-lily", "snake-plant", "spider-plant", "pothos",
    "phalaenopsis-orchid", "fiddle-leaf-fig", "rubber-plant", "calathea", "aloe-vera", "zz-plant",
  ];
  return families.find((family) => pagePath.includes(family)) ?? (pagePath.includes("orchid") ? "phalaenopsis-orchid" : null);
}

async function defaultPlan(input: string): Promise<InternalLinkPlan> {
  const result = await run(internalLinkAgent, input);
  if (!result.finalOutput) throw new Error("Internal Link Editor completed without a plan.");
  return InternalLinkPlanSchema.parse(result.finalOutput);
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
      if (!byPath.has(link.targetPath) || placeholders.has(link.targetPath)) {
        throw new Error(`Internal Link Editor returned an unknown or placeholder target: ${link.targetPath}`);
      }
      if (link.targetPath === source.path) throw new Error(`Internal Link Editor attempted a self-link on ${source.path}.`);
      if (source.outgoingInternalPaths.includes(link.targetPath) || targets.has(link.targetPath)) continue;
      const targetFamily = plantFamily(link.targetPath);
      if (sourceFamily && targetFamily && sourceFamily !== targetFamily) continue;
      if (/[<>]/u.test(link.anchorLabel)) throw new Error("Internal-link labels must be plain text.");
      targets.add(link.targetPath);
      links.push(link);
    }
    if (links.length) recommendations.push({ ...recommendation, links });
  }
  return { ...plan, recommendations };
}

function relatedGuidesBlock(postId: number, links: InternalLinkPlan["recommendations"][number]["links"]): string {
  const items = links.map((link) =>
    `  <li><a href="${escapeHtml(link.targetPath)}">${escapeHtml(link.anchorLabel)}</a></li>`,
  ).join("\n");
  return [
    BLOCK_START,
    `<section class="hpl-related-guides" aria-labelledby="hpl-related-guides-${postId}">`,
    ` <h2 id="hpl-related-guides-${postId}">Related guides</h2>`,
    " <ul>",
    items,
    " </ul>",
    "</section>",
    BLOCK_END,
  ].join("\n");
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
  const posts = inventory.pages.filter((page) => page.type === "post" && !["hello-world"].includes(page.slug));
  const createPlan = dependencies.plan ?? defaultPlan;
  const plan = validatePlan(InternalLinkPlanSchema.parse(await createPlan([
    "Assess every published article in this live inventory and propose only strong missing internal links.",
    "Return only the structured plan. Existing outgoingInternalPaths must never be recommended again.",
    JSON.stringify(inventory, null, 2),
  ].join("\n"))), inventory);

  const runId = now.toISOString().replace(/[:.]/g, "-");
  const outputDirectory = path.join(projectRoot, "content-production", "internal-links", "runs", runId);
  await mkdir(outputDirectory, { recursive: true });
  const reportPath = path.join(outputDirectory, "internal-link-plan.json");
  await writeFile(reportPath, `${JSON.stringify({ inventory, plan }, null, 2)}\n`, "utf8");
  const relativeReportPath = path.relative(projectRoot, reportPath).replaceAll("\\", "/");

  if (!options.apply) {
    return {
      outcome: "report-ready",
      reportPath: relativeReportPath,
      assessedPostCount: posts.length,
      updatedPostCount: 0,
      updatedPaths: [],
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
    if (editable.content.raw.includes(BLOCK_START) || editable.content.raw.includes(BLOCK_END)) continue;

    const nextContent = `${editable.content.raw.trim()}\n\n${relatedGuidesBlock(editable.id, recommendation.links)}\n`;
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
    if (!publicHtml.includes("hpl-related-guides")) {
      throw new Error(`The public article did not render its Related guides section: ${recommendation.sourcePath}`);
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

  await writeFile(path.join(outputDirectory, "apply-result.json"), `${JSON.stringify({ updatedPaths }, null, 2)}\n`, "utf8");
  return {
    outcome: updatedPaths.length ? "links-applied" : "no-safe-updates",
    reportPath: relativeReportPath,
    assessedPostCount: posts.length,
    updatedPostCount: updatedPaths.length,
    updatedPaths,
    message: updatedPaths.length
      ? `Added verified Related guides links to ${updatedPaths.length} published articles.`
      : "The audit found no safe unlinked article batch to update.",
  };
}
