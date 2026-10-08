import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { EditorialQueueSchema, WorkflowBundleSchema, type EditorialQueue, type QueueItem } from "./schemas.js";

const WordPressDraftResponseSchema = z.object({
  id: z.number().int().positive(),
  status: z.literal("draft"),
  link: z.string().url(),
});

export interface WordPressDraftResult {
  outcome: "wordpress-draft" | "no-work";
  itemId: string | null;
  postId: number | null;
  editUrl: string | null;
  message: string;
}

export interface PublisherDependencies {
  fetch?: typeof fetch;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(((?:https:\/\/|\/)[^)]+)\)/g, '<a href="$2">$1</a>');
}

function isTableDivider(line: string): boolean {
  return /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim());
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => inlineMarkdown(cell.trim()));
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const output: string[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headers = tableCells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().includes("|") && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      output.push(`<figure class="wp-block-table"><table><thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></figure>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      output.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      output.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }
    if (line.startsWith("> ")) {
      output.push(`<blockquote><p>${inlineMarkdown(line.slice(2))}</p></blockquote>`);
      index += 1;
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^[-*]\s+|^\d+\.\s+|^>\s+/.test(lines[index].trim())) {
      if (index + 1 < lines.length && isTableDivider(lines[index + 1])) break;
      paragraph.push(lines[index].trim());
      index += 1;
    }
    output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }
  return output.join("\n");
}

function renderBundleContent(bundle: z.infer<typeof WorkflowBundleSchema>): string {
  const sourceById = new Map(bundle.evidence.sources.map((source) => [source.id, source]));
  const usedSourceIds = new Set(bundle.draft.sections.flatMap((section) => section.claimSourceIds));
  const sections = bundle.draft.sections.map((section) => [
    `<h2>${escapeHtml(section.heading)}</h2>`,
    renderMarkdown(section.markdown),
  ].join("\n"));
  const sources = [...usedSourceIds]
    .map((id) => sourceById.get(id))
    .filter((source): source is NonNullable<typeof source> => Boolean(source))
    .map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a> — ${escapeHtml(source.organisation)}</li>`)
    .join("");
  return [
    `<p class="hpl-article-answer"><strong>${escapeHtml(bundle.draft.openingAnswer)}</strong></p>`,
    ...sections,
    sources ? `<h2>Sources and further reading</h2><ol>${sources}</ol>` : "",
    "<hr>",
    "<p><em>Draft created by the HouseplantLab editorial workflow. Factual, photography and final editorial checks are required before publication.</em></p>",
  ].filter(Boolean).join("\n");
}

function selectReadyItem(queue: EditorialQueue): QueueItem | undefined {
  return [...queue.items]
    .filter((item) => item.status === "ready-for-human-review" && item.lastOutputPath)
    .sort((a, b) => a.priority - b.priority)[0];
}

export async function syncReadyDraftToWordPress(
  projectRoot: string,
  dependencies: PublisherDependencies = {},
): Promise<WordPressDraftResult> {
  const env = dependencies.env ?? process.env;
  const siteUrl = env.WP_SITE_URL?.trim();
  const username = env.WP_USERNAME?.trim();
  const appPassword = env.WP_APP_PASSWORD?.trim();
  if (!siteUrl || !username || !appPassword) {
    throw new Error("WP_SITE_URL, WP_USERNAME and WP_APP_PASSWORD are required.");
  }
  const origin = new URL(siteUrl);
  if (
    origin.protocol !== "https:"
    || origin.port
    || origin.username
    || origin.password
    || !["houseplantlab.co.uk", "www.houseplantlab.co.uk"].includes(origin.hostname)
  ) {
    throw new Error("WP_SITE_URL must be the HTTPS HouseplantLab production origin.");
  }

  const queuePath = path.join(projectRoot, "content-production", "queue", "articles.json");
  let queue = EditorialQueueSchema.parse(JSON.parse(await readFile(queuePath, "utf8")));
  const item = selectReadyItem(queue);
  if (!item || !item.lastOutputPath) {
    return { outcome: "no-work", itemId: null, postId: null, editUrl: null, message: "No approved review package is ready to sync." };
  }
  const runsRoot = path.resolve(projectRoot, "content-production", "runs");
  const bundlePath = path.resolve(projectRoot, item.lastOutputPath, "bundle.json");
  if (!bundlePath.startsWith(`${runsRoot}${path.sep}`)) throw new Error("Queue output path escapes the approved runs directory.");
  const bundle = WorkflowBundleSchema.parse(JSON.parse(await readFile(bundlePath, "utf8")));
  if (!bundle.quality.passed || bundle.editorial.status !== "ready-for-human-review" || bundle.editorial.unsupportedClaims.length) {
    throw new Error("The selected package has not passed the editorial and quality gates.");
  }

  const requestBody = {
    title: bundle.draft.title,
    slug: bundle.draft.slug,
    excerpt: bundle.draft.excerpt,
    content: renderBundleContent(bundle),
    status: "draft" as const,
    comment_status: "closed",
    ping_status: "closed",
  };
  const endpoint = new URL("/wp-json/wp/v2/posts", origin);
  const response = await (dependencies.fetch ?? fetch)(endpoint, {
    method: "POST",
    redirect: "error",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) throw new Error(`WordPress draft request failed with HTTP ${response.status}.`);
  const wordpressDraft = WordPressDraftResponseSchema.parse(await response.json());
  const syncedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const editUrl = `${origin.origin}/wp-admin/post.php?post=${wordpressDraft.id}&action=edit`;
  queue = {
    ...queue,
    items: queue.items.map((candidate) => candidate.id === item.id ? {
      ...candidate,
      status: "wordpress-draft" as const,
      updatedAt: syncedAt,
      wordpressPostId: wordpressDraft.id,
      wordpressEditUrl: editUrl,
      wordpressSyncedAt: syncedAt,
      lastError: null,
    } : candidate),
  };
  const temporaryPath = `${queuePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  await rename(temporaryPath, queuePath);
  return { outcome: "wordpress-draft", itemId: item.id, postId: wordpressDraft.id, editUrl, message: "WordPress draft created. Human publication is still required." };
}
