import assert from "node:assert/strict";
import test from "node:test";
import { WorkflowBundleSchema } from "../src/schemas.js";
import { runFixtureWorkflow } from "../src/workflow.js";

test("fixture workflow creates a complete, local-only bundle", async () => {
  const bundle = await runFixtureWorkflow();
  assert.equal(bundle.run.mode, "fixture");
  assert.equal(bundle.draft.publicationStatus, "human-review-required");
  assert.equal(bundle.quality.passed, true);
  assert.equal(WorkflowBundleSchema.safeParse(bundle).success, true);
});

