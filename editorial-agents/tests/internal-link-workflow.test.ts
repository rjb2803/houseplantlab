import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runInternalLinkWorkflow } from "../src/internal-link-workflow.js";
import type { InternalLinkPlan, SiteInventory } from "../src/schemas.js";

const inventory: SiteInventory = {
  auditedAt: "2026-10-10T09:00:00.000Z",
  origin: "https://houseplantlab.co.uk",
  pages: [
    {
      id: 10,
      type: "post",
      title: "Why is my Monstera drooping?",
      slug: "why-is-my-monstera-drooping",
      url: "https://houseplantlab.co.uk/why-is-my-monstera-drooping/",
      path: "/why-is-my-monstera-drooping/",
      modifiedAt: "2026-10-10T08:00:00.000Z",
      categoryIds: [1],
      outgoingInternalPaths: [],
    },
    {
      id: 7,
      type: "plant",
      title: "Monstera deliciosa",
      slug: "monstera-deliciosa",
      url: "https://houseplantlab.co.uk/plants/monstera-deliciosa/",
      path: "/plants/monstera-deliciosa/",
      modifiedAt: "2026-10-10T08:00:00.000Z",
      categoryIds: [],
      outgoingInternalPaths: [],
    },
  ],
  brokenInternalPaths: [],
  orphanPaths: ["/why-is-my-monstera-drooping/"],
  categoryNames: ["Plant care"],
};

const plan: InternalLinkPlan = {
  summary: "The Monstera problem guide should link to its matching plant profile for useful care context.",
  recommendations: [{
    sourcePostId: 10,
    sourcePath: "/why-is-my-monstera-drooping/",
    links: [{
      targetPath: "/plants/monstera-deliciosa/",
      anchorLabel: "Monstera deliciosa care guide",
      reason: "The plant profile gives the reader broader care information after diagnosis.",
    }],
  }],
  requiredHumanChecks: ["Review the Related guides block on desktop and mobile after publication."],
};

test("internal-link workflow applies a verified marked block without changing other post fields", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-links-"));
  const requests: Array<{ url: string; method: string; body: string }> = [];
  const request = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = String(init?.body ?? "");
    requests.push({ url, method, body });
    if (method === "GET" && url.includes("context=edit")) {
      return Response.json({ id: 10, content: { raw: "<p>Useful article copy.</p>", rendered: "<p>Useful article copy.</p>" } });
    }
    if (method === "GET" && url.includes("hpl-link-verify")) {
      return new Response('<section class="hpl-related-guides"><a href="/plants/monstera-deliciosa/">Guide</a></section>');
    }
    if (method === "GET" && url.includes("hpl-link-target-verify")) return new Response("Plant profile");
    const parsed = JSON.parse(body) as { content: string };
    return Response.json({ id: 10, content: { rendered: parsed.content } });
  };

  try {
    const result = await runInternalLinkWorkflow(root, { apply: true, maxSources: 3 }, {
      inventory: async () => inventory,
      plan: async () => plan,
      fetch: request as typeof fetch,
      env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "editor", WP_APP_PASSWORD: "test password" },
      now: () => new Date("2026-10-10T09:00:00.000Z"),
    });
    assert.equal(result.outcome, "links-applied");
    assert.deepEqual(result.updatedPaths, ["/why-is-my-monstera-drooping/"]);
    const postRequests = requests.filter((entry) => entry.method === "POST");
    assert.equal(postRequests.length, 1);
    assert.match(postRequests[0]?.body ?? "", /hpl-internal-links:start/);
    assert.match(postRequests[0]?.body ?? "", /href=\\"\/plants\/monstera-deliciosa\/\\"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("internal-link workflow rejects an invented target before WordPress changes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-links-"));
  const unsafePlan: InternalLinkPlan = {
    ...plan,
    recommendations: [{ ...plan.recommendations[0], links: [{
      targetPath: "/invented-guide/",
      anchorLabel: "Invented guide",
      reason: "This target is not present in the confirmed live inventory and must be rejected.",
    }] }],
  };
  try {
    await assert.rejects(
      runInternalLinkWorkflow(root, { apply: true }, {
        inventory: async () => inventory,
        plan: async () => unsafePlan,
        fetch: (async () => { throw new Error("should not fetch"); }) as typeof fetch,
        env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "editor", WP_APP_PASSWORD: "test password" },
      }),
      /unknown or placeholder target/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("internal-link workflow discards a self-link and applies the remaining safe link", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hpl-links-"));
  const mixedPlan: InternalLinkPlan = {
    ...plan,
    recommendations: [{
      ...plan.recommendations[0],
      links: [
        {
          targetPath: "/why-is-my-monstera-drooping/",
          anchorLabel: "This article",
          reason: "This is an invalid self-link and should be discarded without blocking safe links.",
        },
        ...plan.recommendations[0].links,
      ],
    }],
  };
  const request = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "GET" && url.includes("context=edit")) {
      return Response.json({ id: 10, content: { raw: "<p>Useful article copy.</p>", rendered: "<p>Useful article copy.</p>" } });
    }
    if (method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { content: string };
      assert.doesNotMatch(body.content, /This article/);
      return Response.json({ id: 10, content: { rendered: body.content } });
    }
    if (url.includes("hpl-link-verify")) {
      return new Response('<section class="hpl-related-guides"><a href="/plants/monstera-deliciosa/">Guide</a></section>');
    }
    return new Response("Plant profile");
  };

  try {
    const result = await runInternalLinkWorkflow(root, { apply: true }, {
      inventory: async () => inventory,
      plan: async () => mixedPlan,
      fetch: request as typeof fetch,
      env: { WP_SITE_URL: "https://houseplantlab.co.uk", WP_USERNAME: "editor", WP_APP_PASSWORD: "test password" },
    });
    assert.equal(result.outcome, "links-applied");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
