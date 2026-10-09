import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runBlogDesignWorkflow } from "../src/blog-design-workflow.js";
import { generateBlogDesignImages } from "../src/blog-design-visuals.js";
import type { BlogDesignResearchPackage } from "../src/schemas.js";

async function createProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-design-"));
  const files: Record<string, string> = {
    "docs/project-brief.md": "# HouseplantLab\nA premium UK houseplant publication.",
    "docs/design-reference/README.md": "Warm cream, botanical green and editorial typography.",
    "themes/houseplantlab/theme.json": "{}",
    "themes/houseplantlab/style.css": ":root { --green: #123c2f; }",
    "themes/houseplantlab/templates/index.html": "<!-- wp:query /-->",
    "themes/houseplantlab/parts/header.html": "<!-- wp:site-title /-->",
    "content-production/site-manifest.json": "{\"allowedInternalPaths\":[\"/plants/\"]}",
    "content-production/queue/articles.json": JSON.stringify({
      version: 1, timeZone: "Europe/London", maxRunsPerDay: 2, items: [{
        id: "test-article", assignment: "Prepare a useful test article for readers.", plant: "Monstera deliciosa",
        priority: 1, status: "published", attempts: 1, createdAt: "2026-10-09T10:00:00.000Z",
        updatedAt: "2026-10-09T10:00:00.000Z", lastAttemptAt: "2026-10-09T10:00:00.000Z",
        lastRunId: "run-1", lastOutputPath: "runs/run-1", lastError: null, wordpressPostId: 1,
        wordpressEditUrl: "https://houseplantlab.co.uk/wp-admin/post.php?post=1&action=edit",
        wordpressSyncedAt: "2026-10-09T10:00:00.000Z", wordpressMediaId: 2,
        publishedUrl: "https://houseplantlab.co.uk/test-article/", publishedAt: "2026-10-09T10:00:00.000Z", seoBriefPath: null,
      }],
    }),
  };
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return root;
}

function direction(id: string, name: string) {
  return {
    id, name,
    concept: "A clear publication layout that helps readers discover useful plant-care guidance without visual noise.",
    intendedReaderBehaviour: "Readers can identify a relevant topic quickly, compare useful guides and continue into related content.",
    visualCharacter: "Calm editorial typography, warm cream surfaces and botanical photography.",
    layoutZones: ["Lead story", "Topic rail", "Latest guides", "Problem finder", "Newsletter"].map((zone) => ({
      name: zone, purpose: "Give this part of the page one clear editorial responsibility.",
      desktop: "Use a spacious grid with a strong hierarchy and aligned card edges.",
      mobile: "Stack content in priority order with comfortable touch spacing.",
      interaction: "Support keyboard focus and a clear single-action affordance.",
      content: "Use a real article title, concise summary and useful category label.",
      advertisingRule: "Reserve a fixed-size slot only after a meaningful content group.",
    })),
    interactionPatterns: ["Visible category filtering", "Keyboard-operable cards", "Progressive article loading", "Clear related-guide links"],
    monetisationPlacements: ["One reserved desktop slot after the lead group", "One in-flow mobile slot after several articles"],
    accessibilityRequirements: ["WCAG AA colour contrast", "Visible keyboard focus", "Forty-four pixel touch targets", "Reduced-motion support"],
    strengths: ["Strong editorial hierarchy", "Useful topic discovery", "Predictable ad placement"],
    tradeoffs: ["Requires disciplined image crops", "Needs curated lead content"],
  };
}

const fixture: BlogDesignResearchPackage = {
  status: "human-review-required",
  researchedAt: "2026-10-09T12:00:00.000Z",
  currentStateSummary: "The existing blog template is structurally minimal and needs a stronger hierarchy, discovery tools and responsive editorial presentation.",
  userGoals: ["Increase useful article discovery", "Encourage relevant onward reading", "Create restrained advertising space", "Preserve a premium visual identity"],
  citations: [1, 2, 3, 4].map((index) => ({
    title: `Authoritative design source ${index}`, organisation: "Standards body", url: `https://example.com/source-${index}`,
    accessedOn: "2026-10-09", finding: "This source supports a specific interaction, accessibility or performance recommendation used in the design.",
  })),
  principles: [1, 2, 3, 4, 5].map((index) => ({
    name: `Principle ${index}`, rationale: "A clear hierarchy reduces uncertainty and helps readers make deliberate choices.",
    houseplantLabApplication: "Apply the principle through ordered content groups and descriptive article cards.",
    evidenceUrls: [`https://example.com/source-${Math.min(index, 4)}`],
  })),
  directions: [direction("editorial-front", "Editorial Front"), direction("guided-discovery", "Guided Discovery"), direction("visual-library", "Visual Library")],
  handoff: {
    recommendedDirectionId: "guided-discovery",
    recommendationRationale: "This direction best balances a premium editorial surface with practical problem-led discovery and restrained monetisation.",
    designTokens: ["ink", "paper", "cream", "sage", "accent", "line", "serif", "sans"].map((token) => ({ token: `--${token}`, value: token, usage: "Use consistently across the blog index components." })),
    components: ["Blog hero", "Topic filter", "Lead card", "Article card", "Ad slot", "Newsletter panel"].map((name) => ({ name, responsibility: "Provide one reusable and accessible part of the blog experience.", states: ["default", "focus"] })),
    breakpoints: [
      { name: "mobile", minimumWidth: 0, behaviour: "Use one column and place controls before the article list." },
      { name: "tablet", minimumWidth: 700, behaviour: "Use a two-column card grid with stable reserved media space." },
      { name: "desktop", minimumWidth: 1100, behaviour: "Use a twelve-column grid and a restrained maximum content width." },
    ],
    contentRules: ["Use sentence-case headings", "Keep excerpts concise and useful", "Use real categories only", "Avoid duplicate card links", "Label advertisements clearly"],
    analyticsEvents: ["blog_filter_used", "blog_card_opened", "blog_search_used", "blog_related_opened"].map((name) => ({ name, trigger: "A reader deliberately activates the related control.", purpose: "Measure useful discovery without collecting sensitive content." })),
    acceptanceCriteria: ["Works at 320 pixels", "No horizontal overflow", "All controls use a keyboard", "Focus remains visible", "Images reserve their space", "Ads are clearly labelled", "Headings are semantic", "No live change occurs before approval"],
    openQuestions: ["Which direction should receive a high-fidelity implementation prototype?"],
  },
};

test("blog design workflow writes three reviewable options and a handoff without editing the theme", async () => {
  const root = await createProject();
  let input = "";
  const result = await runBlogDesignWorkflow(root, {
    now: () => new Date("2026-10-09T12:00:00.000Z"),
    design: async (value) => { input = value; return fixture; },
  });
  assert.equal(result.outcome, "design-package-ready");
  assert.equal(result.recommendedDirectionId, "guided-discovery");
  assert.match(input, /LIVE ARTICLE SUBJECTS/);
  assert.match(await readFile(path.join(root, result.optionsPath), "utf8"), /Guided Discovery/);
  assert.match(await readFile(path.join(root, result.handoffPath), "utf8"), /Approval gate/);
  assert.match(await readFile(path.join(root, result.frontendContractPath), "utf8"), /semantic HTML5/);
  assert.match(await readFile(path.join(root, result.frontendContractPath), "utf8"), /Tailwind CSS/);
  assert.match(await readFile(path.join(root, result.designBoardPath), "utf8"), /Recommended/);
  assert.equal(await readFile(path.join(root, "themes/houseplantlab/templates/index.html"), "utf8"), "<!-- wp:query /-->");
});

test("blog design visual workflow renders one review image for each direction", async () => {
  const root = await createProject();
  const design = await runBlogDesignWorkflow(root, {
    now: () => new Date("2026-10-09T12:00:00.000Z"),
    design: async () => fixture,
  });
  const png = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from([0])]);
  const visual = await generateBlogDesignImages(root, design.outputDirectory, {
    env: {},
    generateImage: async () => png,
  });
  assert.equal(visual.imagePaths.length, 3);
  assert.match(await readFile(path.join(root, visual.manifestPath), "utf8"), /semantic-html5-tailwind-css/);
});
