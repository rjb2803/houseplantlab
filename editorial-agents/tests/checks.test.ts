import assert from "node:assert/strict";
import test from "node:test";
import { countReaderWords, draftHasVisibleReferences, runQualityChecks } from "../src/checks.js";
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

test("visible source references are blocked from reader-facing copy", () => {
  const report = runQualityChecks(
    fixtureBrief,
    fixtureEvidence,
    {
      ...fixtureDraft,
      sections: fixtureDraft.sections.map((section, index) =>
        index === 0 ? { ...section, markdown: `${section.markdown} [S1]\n\nEvidence: S1` } : section,
      ),
    },
    fixtureEditorial,
  );
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /exposes internal evidence references/);
});

test("source commentary hidden in disclosures is also blocked", () => {
  const draft = {
    ...fixtureDraft,
    disclosures: [...fixtureDraft.disclosures, "Claims checked against the supplied evidence pack."],
  };
  assert.equal(draftHasVisibleReferences(draft), true);
  const report = runQualityChecks(fixtureBrief, fixtureEvidence, draft, fixtureEditorial);
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /exposes internal evidence references/);
});

test("reader word count excludes metadata and counts article copy", () => {
  const words = countReaderWords(fixtureDraft);
  assert.ok(words > 0);
  const changedMetadata = { ...fixtureDraft, title: "metadata ".repeat(500), excerpt: "metadata ".repeat(500) };
  assert.equal(countReaderWords(changedMetadata), words);
});

test("an undersized article is blocked when the publication minimum applies", () => {
  const report = runQualityChecks(fixtureBrief, fixtureEvidence, fixtureDraft, fixtureEditorial, {
    minimumArticleWords: 1300,
  });
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /too short/);
});

test("a missing closing summary is blocked when the publication rule applies", () => {
  const report = runQualityChecks(fixtureBrief, fixtureEvidence, fixtureDraft, fixtureEditorial, {
    requireClosingSummary: true,
  });
  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /must end with an 'In summary' section/);
});

