import assert from "node:assert/strict";
import test from "node:test";
import { runQualityChecks } from "../src/checks.js";
import { fixtureBrief, fixtureDraft, fixtureEditorial, fixtureEvidence } from "../src/fixture.js";

test("the Monstera acceptance fixture passes deterministic checks", () => {
  const report = runQualityChecks(fixtureBrief, fixtureEvidence, fixtureDraft, fixtureEditorial);
  assert.equal(report.passed, true, report.errors.join("\n"));
  assert.deepEqual(report.errors, []);
});

test("a duplicate slug is blocked", () => {
  const report = runQualityChecks(fixtureBrief, fixtureEvidence, fixtureDraft, fixtureEditorial, {
    existingSlugs: [fixtureDraft.slug],
  });
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /already exists/);
});

test("unsupported editorial claims are blocked", () => {
  const report = runQualityChecks(
    fixtureBrief,
    fixtureEvidence,
    fixtureDraft,
    { ...fixtureEditorial, status: "revise", unsupportedClaims: ["A made-up claim"] },
  );
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /requires revisions/);
  assert.match(report.errors.join("\n"), /unsupported claims/);
});

test("an invalid evidence URL is blocked by application checks", () => {
  const report = runQualityChecks(
    fixtureBrief,
    {
      ...fixtureEvidence,
      sources: fixtureEvidence.sources.map((source, index) =>
        index === 0 ? { ...source, url: "not-a-url" } : source,
      ),
    },
    fixtureDraft,
    fixtureEditorial,
  );
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /valid URL/);
});

test("an invented internal link is blocked by the site manifest", () => {
  const report = runQualityChecks(fixtureBrief, fixtureEvidence, fixtureDraft, fixtureEditorial, {
    allowedInternalPaths: ["/a-confirmed-page/"],
  });
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /does not exist in the site manifest/);
});

test("unverified HouseplantLab experience is blocked", () => {
  const report = runQualityChecks(
    fixtureBrief,
    fixtureEvidence,
    {
      ...fixtureDraft,
      sections: fixtureDraft.sections.map((section, index) =>
        index === 0 ? { ...section, markdown: `${section.markdown} We tested this treatment ourselves.` } : section,
      ),
    },
    fixtureEditorial,
  );
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /without an observation record/);
});

