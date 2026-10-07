import { z } from "zod";

export const LinkPlanSchema = z.object({
  title: z.string().min(3),
  slug: z.string().regex(/^\/[a-z0-9\-/]+\/$/),
  relationship: z.string().min(8),
});

export const PhotographRequirementSchema = z.object({
  shot: z.string().min(3),
  purpose: z.string().min(8),
  required: z.boolean(),
});

export const ArticleBriefSchema = z.object({
  title: z.string().min(10),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  plant: z.string().min(3),
  primaryQuestion: z.string().min(10),
  readerIntent: z.string().min(20),
  targetReader: z.string().min(20),
  requiredSections: z.array(z.string().min(3)).min(5),
  relatedArticles: z.array(LinkPlanSchema).min(1),
  photographsRequired: z.array(PhotographRequirementSchema).min(2),
  commercialOpportunity: z.enum(["none", "affiliate", "comparison-review"]),
  claimsToVerify: z.array(z.string().min(8)).min(3),
  editorNotes: z.array(z.string().min(5)),
});

export const EvidenceSourceSchema = z.object({
  id: z.string().regex(/^S\d+$/),
  title: z.string().min(5),
  organisation: z.string().min(2),
  url: z.string().min(8),
  accessedOn: z.string().date(),
  sourceType: z.enum(["horticultural-authority", "academic", "veterinary-authority", "manufacturer-primary", "houseplantlab-observation"]),
});

export const EvidenceClaimSchema = z.object({
  claim: z.string().min(15),
  sourceIds: z.array(z.string().regex(/^S\d+$/)).min(1),
  evidenceSummary: z.string().min(20),
  confidence: z.enum(["high", "medium", "low"]),
  requiresOwnerObservation: z.boolean(),
});

export const EvidencePackSchema = z.object({
  briefSlug: z.string().min(3),
  researchedAt: z.string().datetime(),
  sources: z.array(EvidenceSourceSchema).min(2),
  claims: z.array(EvidenceClaimSchema).min(4),
  conflicts: z.array(z.string()),
  prohibitedAssumptions: z.array(z.string()).min(2),
});

export const DraftSectionSchema = z.object({
  heading: z.string().min(3),
  purpose: z.string().min(8),
  markdown: z.string().min(80),
  claimSourceIds: z.array(z.string().regex(/^S\d+$/)),
});

export const DraftPackageSchema = z.object({
  title: z.string().min(10),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().min(80).max(300),
  metaTitle: z.string().min(20).max(65),
  metaDescription: z.string().min(80).max(165),
  openingAnswer: z.string().min(100),
  sections: z.array(DraftSectionSchema).min(5),
  internalLinks: z.array(LinkPlanSchema).min(1),
  photographyPlan: z.array(PhotographRequirementSchema).min(2),
  affiliateNotes: z.array(z.string()),
  disclosures: z.array(z.string()).min(1),
  publicationStatus: z.literal("human-review-required"),
});

export const EditorialFindingSchema = z.object({
  severity: z.enum(["blocker", "warning", "note"]),
  category: z.enum(["evidence", "style", "seo", "photography", "commercial", "duplication", "safety"]),
  location: z.string().min(2),
  message: z.string().min(10),
});

export const EditorialReportSchema = z.object({
  status: z.enum(["revise", "ready-for-human-review"]),
  summary: z.string().min(20),
  findings: z.array(EditorialFindingSchema),
  verifiedClaimCount: z.number().int().nonnegative(),
  unsupportedClaims: z.array(z.string()),
  requiredHumanChecks: z.array(z.string()).min(2),
});

export const QualityReportSchema = z.object({
  passed: z.boolean(),
  checkedAt: z.string().datetime(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const WorkflowBundleSchema = z.object({
  run: z.object({
    id: z.string().min(3),
    mode: z.enum(["fixture", "live"]),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    revisionCount: z.number().int().nonnegative(),
  }),
  brief: ArticleBriefSchema,
  evidence: EvidencePackSchema,
  draft: DraftPackageSchema,
  editorial: EditorialReportSchema,
  editorialHistory: z.array(EditorialReportSchema).min(1),
  quality: QualityReportSchema,
});

export type ArticleBrief = z.infer<typeof ArticleBriefSchema>;
export type EvidencePack = z.infer<typeof EvidencePackSchema>;
export type DraftPackage = z.infer<typeof DraftPackageSchema>;
export type EditorialReport = z.infer<typeof EditorialReportSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;
export type WorkflowBundle = z.infer<typeof WorkflowBundleSchema>;

