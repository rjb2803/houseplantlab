import {
  ArticleBriefSchema,
  DraftPackageSchema,
  EditorialReportSchema,
  EvidencePackSchema,
  type ArticleBrief,
  type DraftPackage,
  type EditorialReport,
  type EvidencePack,
  type QualityReport,
} from "./schemas.js";

export interface QualityContext {
  existingSlugs?: string[];
  allowedInternalPaths?: string[];
}

const PLACEHOLDER_PATTERN = /\b(?:todo|tbc|lorem ipsum|insert (?:link|image|source)|placeholder)\b/i;
const UNVERIFIED_EXPERIENCE_PATTERN = /\b(?:we tested|our test|we found|in our experiment|we recommend)\b/i;
const AI_STYLE_PATTERN = /\b(?:delve into|in today's fast-paced world|unlock the secrets|game-changer|revolutionary)\b/i;
const VISIBLE_REFERENCE_PATTERN = /\[(?:S\d+)(?:\s*,\s*S\d+)*\]|\[S\d+\](?:\[S\d+\])+|^\s*(?:evidence|sources?|references?)\s*:/im;

export function runQualityChecks(
  briefInput: ArticleBrief,
  evidenceInput: EvidencePack,
  draftInput: DraftPackage,
  editorialInput: EditorialReport,
  context: QualityContext = {},
): QualityReport {
  const brief = ArticleBriefSchema.parse(briefInput);
  const evidence = EvidencePackSchema.parse(evidenceInput);
  const draft = DraftPackageSchema.parse(draftInput);
  const editorial = EditorialReportSchema.parse(editorialInput);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (evidence.briefSlug !== brief.slug) errors.push("Evidence pack does not belong to the article brief.");
  if (draft.slug !== brief.slug) errors.push("Draft slug does not match the approved brief.");
  if (context.existingSlugs?.includes(draft.slug)) errors.push(`The slug already exists: ${draft.slug}`);

  const sourceIds = new Set(evidence.sources.map((source) => source.id));
  for (const source of evidence.sources) {
    try {
      const url = new URL(source.url);
      if (url.protocol !== "https:") errors.push(`Evidence source ${source.id} must use HTTPS.`);
    } catch {
      errors.push(`Evidence source ${source.id} does not contain a valid URL.`);
    }
  }
  for (const claim of evidence.claims) {
    for (const sourceId of claim.sourceIds) {
      if (!sourceIds.has(sourceId)) errors.push(`Evidence claim refers to missing source ${sourceId}.`);
    }
  }

  for (const section of draft.sections) {
    for (const sourceId of section.claimSourceIds) {
      if (!sourceIds.has(sourceId)) errors.push(`Draft section '${section.heading}' refers to missing source ${sourceId}.`);
    }
  }

  const fullDraft = [draft.title, draft.excerpt, draft.openingAnswer, ...draft.sections.map((section) => section.markdown)].join("\n");
  if (PLACEHOLDER_PATTERN.test(fullDraft)) errors.push("Draft contains placeholder language.");
  if (VISIBLE_REFERENCE_PATTERN.test(fullDraft)) errors.push("Draft exposes internal evidence references in reader-facing copy.");
  if (AI_STYLE_PATTERN.test(fullDraft)) warnings.push("Draft contains generic AI-style phrasing.");

  const hasOwnerObservation = evidence.sources.some((source) => source.sourceType === "houseplantlab-observation");
  if (UNVERIFIED_EXPERIENCE_PATTERN.test(fullDraft) && !hasOwnerObservation) {
    errors.push("Draft claims HouseplantLab experience without an observation record.");
  }

  if (draft.publicationStatus !== "human-review-required") errors.push("Draft attempted to bypass human review.");
  if (editorial.status === "revise") errors.push("Editorial agent requires revisions.");
  if (editorial.unsupportedClaims.length > 0) errors.push("Editorial report contains unsupported claims.");
  if (editorial.findings.some((finding) => finding.severity === "blocker")) errors.push("Editorial report contains blocker findings.");

  for (const link of draft.internalLinks) {
    if (!link.slug.startsWith("/") || !link.slug.endsWith("/")) errors.push(`Internal link is not canonical: ${link.slug}`);
    if (context.allowedInternalPaths && !context.allowedInternalPaths.includes(link.slug)) {
      errors.push(`Internal link does not exist in the site manifest: ${link.slug}`);
    }
  }

  if (brief.commercialOpportunity !== "none" && !draft.disclosures.some((item) => /affiliate/i.test(item))) {
    errors.push("Commercial notes exist without an affiliate disclosure.");
  }

  return {
    passed: errors.length === 0,
    checkedAt: new Date().toISOString(),
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

