import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { run } from "@openai/agents";
import { blogDesignResearchAgent } from "./agents.js";
import {
  BlogDesignResearchPackageSchema,
  EditorialQueueSchema,
  type BlogDesignResearchPackage,
} from "./schemas.js";

export interface BlogDesignWorkflowDependencies {
  now?: () => Date;
  design?: (input: string) => Promise<BlogDesignResearchPackage>;
}

export interface BlogDesignWorkflowResult {
  outcome: "design-package-ready";
  outputDirectory: string;
  researchPath: string;
  optionsPath: string;
  handoffPath: string;
  frontendContractPath: string;
  designBoardPath: string;
  recommendedDirectionId: string;
  message: string;
}

const contextFiles = [
  "docs/project-brief.md",
  "docs/design-reference/README.md",
  "themes/houseplantlab/theme.json",
  "themes/houseplantlab/style.css",
  "themes/houseplantlab/templates/index.html",
  "themes/houseplantlab/parts/header.html",
  "content-production/site-manifest.json",
];

async function readContext(projectRoot: string): Promise<string> {
  const sections: string[] = [];
  for (const relativePath of contextFiles) {
    const content = await readFile(path.join(projectRoot, relativePath), "utf8");
    sections.push(`FILE: ${relativePath}\n${content.slice(0, 18_000)}`);
  }
  const queue = EditorialQueueSchema.parse(JSON.parse(
    await readFile(path.join(projectRoot, "content-production", "queue", "articles.json"), "utf8"),
  ));
  const liveArticles = queue.items
    .filter((item) => item.status === "published" && item.publishedUrl)
    .map((item) => ({ plant: item.plant, url: item.publishedUrl, assignment: item.assignment }));
  sections.push(`LIVE ARTICLE SUBJECTS\n${JSON.stringify(liveArticles, null, 2)}`);
  return sections.join("\n\n---\n\n");
}

async function defaultDesign(input: string): Promise<BlogDesignResearchPackage> {
  const result = await run(blogDesignResearchAgent, input);
  if (!result.finalOutput) throw new Error("Blog Experience Designer completed without a package.");
  return BlogDesignResearchPackageSchema.parse(result.finalOutput);
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function buildOptionsMarkdown(pkg: BlogDesignResearchPackage): string {
  const directions = pkg.directions.map((direction, index) => [
    `## ${index + 1}. ${direction.name}`,
    "",
    direction.concept,
    "",
    `**Intended reader behaviour:** ${direction.intendedReaderBehaviour}`,
    "",
    `**Visual character:** ${direction.visualCharacter}`,
    "",
    "### Page zones",
    "",
    ...direction.layoutZones.flatMap((zone) => [
      `#### ${zone.name}`,
      "",
      `- Purpose: ${zone.purpose}`,
      `- Desktop: ${zone.desktop}`,
      `- Mobile: ${zone.mobile}`,
      `- Interaction: ${zone.interaction}`,
      `- Content: ${zone.content}`,
      `- Advertising: ${zone.advertisingRule}`,
      "",
    ]),
    "### Interaction patterns",
    "",
    bulletList(direction.interactionPatterns),
    "",
    "### Monetisation placements",
    "",
    bulletList(direction.monetisationPlacements),
    "",
    "### Accessibility requirements",
    "",
    bulletList(direction.accessibilityRequirements),
    "",
    "### Strengths",
    "",
    bulletList(direction.strengths),
    "",
    "### Trade-offs",
    "",
    bulletList(direction.tradeoffs),
  ].join("\n")).join("\n\n---\n\n");

  return [
    "# HouseplantLab blog design directions",
    "",
    "> Status: human review required. These are design proposals, not live-site changes.",
    "",
    "## Current state",
    "",
    pkg.currentStateSummary,
    "",
    "## Reader and business goals",
    "",
    bulletList(pkg.userGoals),
    "",
    "## Research principles",
    "",
    ...pkg.principles.flatMap((principle) => [
      `### ${principle.name}`,
      "",
      principle.rationale,
      "",
      `**HouseplantLab application:** ${principle.houseplantLabApplication}`,
      "",
    ]),
    directions,
    "",
    "## Research sources",
    "",
    ...pkg.citations.map((citation) => `- [${citation.title}](${citation.url}) — ${citation.finding}`),
    "",
  ].join("\n");
}

function buildHandoffMarkdown(pkg: BlogDesignResearchPackage): string {
  const handoff = pkg.handoff;
  const selected = pkg.directions.find((direction) => direction.id === handoff.recommendedDirectionId);
  if (!selected) throw new Error("Recommended design direction does not exist in the three proposed directions.");
  return [
    "# HouseplantLab blog design handoff",
    "",
    "> Approval gate: do not implement this handoff until the owner approves the recommended direction.",
    "",
    `## Recommended direction: ${selected.name}`,
    "",
    handoff.recommendationRationale,
    "",
    "## Design tokens",
    "",
    "| Token | Value | Usage |",
    "| --- | --- | --- |",
    ...handoff.designTokens.map((token) => `| ${token.token} | ${token.value} | ${token.usage} |`),
    "",
    "## Components",
    "",
    ...handoff.components.flatMap((component) => [
      `### ${component.name}`,
      "",
      component.responsibility,
      "",
      `States: ${component.states.join(", ")}`,
      "",
    ]),
    "## Responsive breakpoints",
    "",
    "| Name | Minimum width | Behaviour |",
    "| --- | ---: | --- |",
    ...handoff.breakpoints.map((breakpoint) => `| ${breakpoint.name} | ${breakpoint.minimumWidth}px | ${breakpoint.behaviour} |`),
    "",
    "## Content rules",
    "",
    bulletList(handoff.contentRules),
    "",
    "## Analytics events",
    "",
    "| Event | Trigger | Purpose |",
    "| --- | --- | --- |",
    ...handoff.analyticsEvents.map((event) => `| ${event.name} | ${event.trigger} | ${event.purpose} |`),
    "",
    "## Acceptance criteria",
    "",
    handoff.acceptanceCriteria.map((criterion, index) => `${index + 1}. ${criterion}`).join("\n"),
    "",
    "## Decisions still needed",
    "",
    handoff.openQuestions.length ? bulletList(handoff.openQuestions) : "- None recorded.",
    "",
  ].join("\n");
}

function buildFrontendContract(): string {
  return `# Blog frontend implementation contract

This contract applies to every approved HouseplantLab blog design. It is deliberately framework-specific so the visual direction can be handed to implementation without reinterpretation.

## Required stack

- Use semantic HTML5 landmarks and elements: \`header\`, \`nav\`, \`main\`, \`section\`, \`article\`, \`aside\`, \`figure\`, \`form\`, \`footer\` and correctly ordered headings.
- Use Tailwind CSS for layout, spacing, typography, colour, responsive behaviour, interaction states and reduced-motion variants.
- Keep WordPress data and template responsibilities intact; Tailwind must style server-rendered content rather than replace it with a client-only application.
- Prefer reusable components and documented utility compositions over one-off arbitrary values.
- Custom CSS is allowed only for approved design tokens, WordPress integration seams or behaviour Tailwind cannot express cleanly.

## Responsive rules

- Mobile-first source order must remain meaningful without CSS.
- Use a one-column base layout, add editorial spans at \`md\`/\`lg\`, and constrain wide layouts with an approved \`max-w-*\` container.
- Avoid absolute positioning for primary content and any layout that depends on fixed text height.
- Reserve image and advertisement space with \`aspect-*\`, explicit dimensions or approved min-height tokens.
- Verify 320px, 390px, 768px, 1024px, 1440px and 1920px widths with no horizontal page overflow.

## Interaction and accessibility

- Every interactive state needs Tailwind \`focus-visible\`, hover, active and disabled treatment where applicable.
- Use native controls first; dialogs and mobile filter sheets must manage focus, Escape and focus return correctly.
- Honour \`motion-reduce\`; no essential information may depend on animation or hover.
- Maintain WCAG 2.2 AA contrast and logical keyboard/source order.
- Use descriptive links and real labels; never make a whole card contain conflicting nested actions.

## Advertising and performance

- Ads require a semantic, clearly labelled reserved component and may not resemble article cards or filters.
- Do not use sticky overlays, interstitials or placements that interrupt the diagnostic pathway.
- Above-fold imagery must have intrinsic dimensions and appropriate priority; below-fold imagery should be lazy-loaded.
- The approved implementation must pass layout-shift checks before deployment.

## Handoff boundary

The generated PNGs are visual targets, not pixel-perfect specifications. Implementation must preserve hierarchy, rhythm and intent while using maintainable HTML5 and Tailwind CSS. No design is approved for production until the owner selects a direction.
`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function buildDesignBoard(pkg: BlogDesignResearchPackage): string {
  const cards = pkg.directions.map((direction, index) => {
    const zones = direction.layoutZones.map((zone, zoneIndex) => `
      <section class="zone zone-${(zoneIndex % 4) + 1}">
        <span>${escapeHtml(zone.name)}</span>
        <small>${escapeHtml(zone.purpose)}</small>
      </section>`).join("");
    const label = direction.id === pkg.handoff.recommendedDirectionId ? '<b class="pick">Recommended</b>' : "";
    return `<article class="direction">
      <header><div><p>Direction ${index + 1}</p><h2>${escapeHtml(direction.name)}</h2></div>${label}</header>
      <p class="concept">${escapeHtml(direction.concept)}</p>
      <div class="browser"><div class="browser-bar"><i></i><i></i><i></i></div><div class="site-head"><strong>HouseplantLab</strong><nav>Plants &nbsp; Problems &nbsp; Care Guides &nbsp; Blog</nav></div><div class="wireframe">${zones}</div></div>
      <div class="notes"><div><h3>Best for</h3><p>${escapeHtml(direction.intendedReaderBehaviour)}</p></div><div><h3>Trade-off</h3><p>${escapeHtml(direction.tradeoffs[0])}</p></div></div>
    </article>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HouseplantLab blog design board</title><style>
  :root{--ink:#123c2f;--paper:#f7f3e9;--cream:#fffdf7;--sage:#dce7d7;--line:#cbd6c7;--accent:#39755c;--muted:#627068;--serif:Georgia,'Times New Roman',serif;--sans:Inter,Arial,sans-serif}*{box-sizing:border-box}body{margin:0;background:#e8eee5;color:var(--ink);font-family:var(--sans)}main{max-width:1500px;margin:auto;padding:48px 24px 80px}.intro{max-width:850px;margin-bottom:34px}.eyebrow,.direction header p{margin:0 0 8px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;font-size:12px;color:var(--accent)}h1,h2,h3{font-family:var(--serif);margin:0}h1{font-size:clamp(38px,5vw,66px);line-height:1}.intro>p{font-size:18px;line-height:1.6;color:#3f544a}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.direction{background:var(--cream);border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:0 18px 48px rgba(21,54,40,.08)}.direction header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.direction h2{font-size:28px}.pick{font-size:12px;background:var(--ink);color:white;padding:8px 10px;border-radius:999px}.concept{min-height:112px;line-height:1.5;color:#46594f}.browser{overflow:hidden;border:1px solid #abb9af;border-radius:13px;background:white;box-shadow:0 12px 28px rgba(20,45,35,.09)}.browser-bar{height:25px;background:#ecf0eb;padding:8px}.browser-bar i{display:inline-block;width:7px;height:7px;margin-right:4px;border-radius:50%;background:#9eaea3}.site-head{display:flex;justify-content:space-between;gap:8px;padding:12px;font-size:10px;border-bottom:1px solid #dbe2dc}.site-head strong{font-family:var(--serif);font-size:13px}.wireframe{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;padding:10px;background:var(--paper);min-height:390px}.zone{display:flex;flex-direction:column;justify-content:flex-end;min-height:90px;border-radius:9px;padding:10px;background:var(--sage);border:1px solid #bfd0bc}.zone span{font-family:var(--serif);font-weight:700}.zone small{display:block;margin-top:5px;line-height:1.25;color:#52645a}.zone-1{grid-column:span 6;min-height:115px;background:linear-gradient(120deg,#123c2f,#4d745c);color:white}.zone-1 small{color:#e8eee5}.zone-2{grid-column:span 4}.zone-3{grid-column:span 2;background:#f0e3c8}.zone-4{grid-column:span 3}.notes{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:17px}.notes h3{font-size:17px}.notes p{font-size:13px;line-height:1.45;color:var(--muted)}footer{margin-top:34px;padding:20px;border:1px solid var(--line);border-radius:14px;background:#f7fbf5} @media(max-width:1100px){.grid{grid-template-columns:1fr}.concept{min-height:auto}.wireframe{min-height:330px}}@media(max-width:600px){main{padding:30px 14px}.direction{padding:15px}.site-head nav{display:none}.wireframe{grid-template-columns:1fr}.zone,.zone-1,.zone-2,.zone-3,.zone-4{grid-column:1}.notes{grid-template-columns:1fr}}
  </style></head><body><main><section class="intro"><p class="eyebrow">Human review required</p><h1>Blog design direction board</h1><p>Three researched interaction directions for HouseplantLab. This board is a comparison artifact only; it does not change the live WordPress site.</p></section><section class="grid">${cards}</section><footer><strong>Recommended:</strong> ${escapeHtml(pkg.handoff.recommendedDirectionId)} — ${escapeHtml(pkg.handoff.recommendationRationale)}</footer></main></body></html>`;
}

export async function runBlogDesignWorkflow(
  projectRoot: string,
  dependencies: BlogDesignWorkflowDependencies = {},
): Promise<BlogDesignWorkflowResult> {
  const now = dependencies.now?.() ?? new Date();
  const context = await readContext(projectRoot);
  const createDesign = dependencies.design ?? defaultDesign;
  const pkg = BlogDesignResearchPackageSchema.parse(await createDesign([
    `Current date: ${now.toISOString().slice(0, 10)}.`,
    "Research the best interaction design for the HouseplantLab blog index and prepare three design directions plus an implementation handoff.",
    "The owner will approve a direction before implementation. Return only the structured design-research package.",
    "PROJECT CONTEXT",
    context,
  ].join("\n\n")));
  const citedUrls = [
    ...pkg.citations.map((citation) => citation.url),
    ...pkg.principles.flatMap((principle) => principle.evidenceUrls),
  ];
  for (const value of citedUrls) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`Blog design research returned an invalid evidence URL: ${value}`);
    }
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error(`Blog design research returned an unsafe evidence URL: ${value}`);
    }
  }
  if (!pkg.directions.some((direction) => direction.id === pkg.handoff.recommendedDirectionId)) {
    throw new Error("The recommended design direction was not included in the proposed directions.");
  }

  const runId = now.toISOString().replace(/[:.]/g, "-");
  const outputDirectory = path.join(projectRoot, "docs", "design-research", "blog-page", runId);
  await mkdir(outputDirectory, { recursive: true });
  const researchPath = path.join(outputDirectory, "research.json");
  const optionsPath = path.join(outputDirectory, "design-options.md");
  const handoffPath = path.join(outputDirectory, "handoff.md");
  const frontendContractPath = path.join(outputDirectory, "frontend-contract.md");
  const designBoardPath = path.join(outputDirectory, "design-board.html");
  await Promise.all([
    writeFile(researchPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8"),
    writeFile(optionsPath, buildOptionsMarkdown(pkg), "utf8"),
    writeFile(handoffPath, buildHandoffMarkdown(pkg), "utf8"),
    writeFile(frontendContractPath, buildFrontendContract(), "utf8"),
    writeFile(designBoardPath, buildDesignBoard(pkg), "utf8"),
  ]);
  const relative = (filePath: string) => path.relative(projectRoot, filePath).replaceAll("\\", "/");
  return {
    outcome: "design-package-ready",
    outputDirectory: relative(outputDirectory),
    researchPath: relative(researchPath),
    optionsPath: relative(optionsPath),
    handoffPath: relative(handoffPath),
    frontendContractPath: relative(frontendContractPath),
    designBoardPath: relative(designBoardPath),
    recommendedDirectionId: pkg.handoff.recommendedDirectionId,
    message: "Three blog design directions and an implementation-ready handoff are ready for owner review. No theme or live-site files were changed.",
  };
}
