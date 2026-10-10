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

export const ImageBriefSchema = z.object({
  articleSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  assetType: z.literal("hero"),
  prompt: z.string().min(120),
  filename: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-hero-v\d+\.png$/),
  altText: z.string().min(20).max(180),
  caption: z.string().min(20).max(240),
  classification: z.literal("ai-generated-editorial-illustration"),
  diagnosticUseAllowed: z.literal(false),
  visualChecks: z.array(z.string().min(8)).min(4),
});

export const ImageManifestSchema = z.object({
  generatedAt: z.string().datetime(),
  model: z.string().min(3),
  status: z.literal("human-review-required"),
  sourceBundlePath: z.string().min(3),
  imagePath: z.string().min(3),
  brief: ImageBriefSchema,
});

export const SitePageSchema = z.object({
  id: z.number().int().nonnegative(),
  type: z.enum(["post", "page", "plant"]),
  title: z.string().min(1),
  slug: z.string().min(1),
  url: z.string().min(8),
  path: z.string().regex(/^\/.*\/$/),
  modifiedAt: z.string().datetime(),
  categoryIds: z.array(z.number().int().nonnegative()),
  outgoingInternalPaths: z.array(z.string().regex(/^\/.*\/$/)),
});

export const SiteInventorySchema = z.object({
  auditedAt: z.string().datetime(),
  origin: z.literal("https://houseplantlab.co.uk"),
  pages: z.array(SitePageSchema),
  brokenInternalPaths: z.array(z.string()),
  orphanPaths: z.array(z.string()),
  categoryNames: z.array(z.string()),
});

export const SearchPerformanceRowSchema = z.object({
  page: z.string().url(),
  query: z.string().min(1),
  clicks: z.number().nonnegative(),
  impressions: z.number().nonnegative(),
  ctr: z.number().min(0).max(1),
  position: z.number().positive(),
});

export const SearchPerformanceSnapshotSchema = z.object({
  siteUrl: z.string().min(3),
  startDate: z.string().date(),
  endDate: z.string().date(),
  capturedAt: z.string().datetime(),
  rows: z.array(SearchPerformanceRowSchema),
  topPerformingPages: z.array(z.object({
    page: z.string().url(),
    clicks: z.number().nonnegative(),
    impressions: z.number().nonnegative(),
    ctr: z.number().min(0).max(1),
    averagePosition: z.number().positive(),
  })),
  strikingDistanceQueries: z.array(SearchPerformanceRowSchema),
});

export const SiteArchitectureReportSchema = z.object({
  summary: z.string().min(30),
  requiredHubs: z.array(z.object({ title: z.string(), path: z.string(), purpose: z.string() })),
  orphanFixes: z.array(z.object({
    orphanPath: z.string(),
    action: z.enum(["add-internal-links", "review-placeholder-removal"]),
    linkFromPaths: z.array(z.string()),
    reason: z.string(),
  })),
  brokenLinkFixes: z.array(z.object({ brokenPath: z.string(), foundOnPaths: z.array(z.string()), action: z.string() })),
  categoryActions: z.array(z.string()),
  requiredHumanChecks: z.array(z.string()).min(1),
});

export const InternalLinkPlanSchema = z.object({
  summary: z.string().min(30),
  recommendations: z.array(z.object({
    sourcePostId: z.number().int().positive(),
    sourcePath: z.string().regex(/^\/.*\/$/),
    links: z.array(z.object({
      targetPath: z.string().regex(/^\/.*\/$/),
      anchorLabel: z.string().min(3).max(80),
      reason: z.string().min(20),
    })).min(1).max(3),
  })),
  requiredHumanChecks: z.array(z.string().min(10)).min(1),
});

export const SeoContentBriefSchema = z.object({
  recommendationType: z.enum(["new-article", "refresh-existing"]),
  plant: z.string().min(3),
  proposedTitle: z.string().min(10),
  proposedSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  targetUrl: z.string().url().nullable(),
  primaryQuery: z.string().min(3),
  supportingQueries: z.array(z.string().min(3)),
  performanceEvidence: z.object({
    clicks: z.number().nonnegative(),
    impressions: z.number().nonnegative(),
    ctr: z.number().min(0).max(1),
    averagePosition: z.number().positive(),
    startDate: z.string().date(),
    endDate: z.string().date(),
  }),
  rationale: z.string().min(40),
  requiredSections: z.array(z.string().min(3)).min(4),
  linkToPaths: z.array(z.string().regex(/^\/.*\/$/)).min(1),
  requestLinksFromPaths: z.array(z.string().regex(/^\/.*\/$/)),
  writerAssignment: z.string().min(80),
  humanReviewNotes: z.array(z.string()).min(1),
});

export const DesignResearchCitationSchema = z.object({
  title: z.string().min(5),
  organisation: z.string().min(2),
  url: z.string().min(8),
  accessedOn: z.string().date(),
  finding: z.string().min(30),
});

export const InteractionPrincipleSchema = z.object({
  name: z.string().min(4),
  rationale: z.string().min(30),
  houseplantLabApplication: z.string().min(30),
  evidenceUrls: z.array(z.string().min(8)).min(1),
});

export const BlogLayoutZoneSchema = z.object({
  name: z.string().min(3),
  purpose: z.string().min(20),
  desktop: z.string().min(20),
  mobile: z.string().min(20),
  interaction: z.string().min(20),
  content: z.string().min(20),
  advertisingRule: z.string().min(20),
});

export const BlogDesignDirectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(4),
  concept: z.string().min(40),
  intendedReaderBehaviour: z.string().min(40),
  visualCharacter: z.string().min(30),
  layoutZones: z.array(BlogLayoutZoneSchema).min(5),
  interactionPatterns: z.array(z.string().min(15)).min(4),
  monetisationPlacements: z.array(z.string().min(20)).min(2),
  accessibilityRequirements: z.array(z.string().min(15)).min(4),
  strengths: z.array(z.string().min(15)).min(3),
  tradeoffs: z.array(z.string().min(15)).min(2),
});

export const BlogDesignHandoffSchema = z.object({
  recommendedDirectionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  recommendationRationale: z.string().min(60),
  designTokens: z.array(z.object({ token: z.string().min(2), value: z.string().min(1), usage: z.string().min(10) })).min(8),
  components: z.array(z.object({ name: z.string().min(3), responsibility: z.string().min(20), states: z.array(z.string().min(2)).min(1) })).min(6),
  breakpoints: z.array(z.object({ name: z.string().min(2), minimumWidth: z.number().int().nonnegative(), behaviour: z.string().min(20) })).min(3),
  contentRules: z.array(z.string().min(15)).min(5),
  analyticsEvents: z.array(z.object({ name: z.string().regex(/^[a-z0-9_]+$/), trigger: z.string().min(15), purpose: z.string().min(15) })).min(4),
  acceptanceCriteria: z.array(z.string().min(15)).min(8),
  openQuestions: z.array(z.string().min(10)),
});

export const BlogDesignResearchPackageSchema = z.object({
  status: z.literal("human-review-required"),
  researchedAt: z.string().datetime(),
  currentStateSummary: z.string().min(60),
  userGoals: z.array(z.string().min(15)).min(4),
  citations: z.array(DesignResearchCitationSchema).min(4),
  principles: z.array(InteractionPrincipleSchema).min(5),
  directions: z.array(BlogDesignDirectionSchema).length(3),
  handoff: BlogDesignHandoffSchema,
});

export const QueueStatusSchema = z.enum([
  "queued",
  "running",
  "ready-for-human-review",
  "wordpress-draft",
  "published",
  "needs-revision",
  "failed",
  "paused",
]);

export const QueueItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  assignment: z.string().min(20),
  plant: z.string().min(3),
  priority: z.number().int().positive(),
  status: QueueStatusSchema,
  attempts: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastAttemptAt: z.string().datetime().nullable(),
  lastRunId: z.string().nullable(),
  lastOutputPath: z.string().nullable(),
  lastError: z.string().nullable(),
  wordpressPostId: z.number().int().positive().nullable().default(null),
  wordpressEditUrl: z.string().url().nullable().default(null),
  wordpressSyncedAt: z.string().datetime().nullable().default(null),
  wordpressMediaId: z.number().int().positive().nullable().default(null),
  publishedUrl: z.string().url().nullable().default(null),
  publishedAt: z.string().datetime().nullable().default(null),
  seoBriefPath: z.string().nullable().default(null),
});

export const EditorialQueueSchema = z.object({
  version: z.literal(1),
  timeZone: z.literal("Europe/London"),
  maxRunsPerDay: z.number().int().min(1).max(40),
  items: z.array(QueueItemSchema),
});

export type ArticleBrief = z.infer<typeof ArticleBriefSchema>;
export type EvidencePack = z.infer<typeof EvidencePackSchema>;
export type DraftPackage = z.infer<typeof DraftPackageSchema>;
export type EditorialReport = z.infer<typeof EditorialReportSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;
export type WorkflowBundle = z.infer<typeof WorkflowBundleSchema>;
export type ImageBrief = z.infer<typeof ImageBriefSchema>;
export type ImageManifest = z.infer<typeof ImageManifestSchema>;
export type SiteInventory = z.infer<typeof SiteInventorySchema>;
export type SearchPerformanceRow = z.infer<typeof SearchPerformanceRowSchema>;
export type SearchPerformanceSnapshot = z.infer<typeof SearchPerformanceSnapshotSchema>;
export type SiteArchitectureReport = z.infer<typeof SiteArchitectureReportSchema>;
export type InternalLinkPlan = z.infer<typeof InternalLinkPlanSchema>;
export type SeoContentBrief = z.infer<typeof SeoContentBriefSchema>;
export type BlogDesignResearchPackage = z.infer<typeof BlogDesignResearchPackageSchema>;
export type QueueItem = z.infer<typeof QueueItemSchema>;
export type EditorialQueue = z.infer<typeof EditorialQueueSchema>;

