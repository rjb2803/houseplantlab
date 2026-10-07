import type { ArticleBrief, DraftPackage, EditorialReport, EvidencePack } from "./schemas.js";

export const fixtureBrief: ArticleBrief = {
  title: "Why are my Monstera leaves turning yellow?",
  slug: "monstera-leaves-turning-yellow",
  plant: "Monstera deliciosa",
  primaryQuestion: "Why are my Monstera leaves turning yellow, and what should I do next?",
  readerIntent: "Diagnose the most likely cause of yellow foliage and take a safe corrective action without making the plant worse.",
  targetReader: "A UK houseplant owner with an established Monstera showing one or more yellow leaves.",
  requiredSections: [
    "Quick answer",
    "Check the watering pattern",
    "Check light and temperature",
    "Inspect roots and soil",
    "When one yellow leaf is normal",
    "Recovery checklist",
  ],
  relatedArticles: [
    {
      title: "Monstera deliciosa care guide",
      slug: "/plants/monstera-deliciosa/",
      relationship: "Parent plant profile and baseline care guidance.",
    },
  ],
  photographsRequired: [
    { shot: "Whole plant", purpose: "Show the distribution of yellow leaves across the plant.", required: true },
    { shot: "Yellow leaf close-up", purpose: "Record colour pattern and any spotting or edge damage.", required: true },
    { shot: "Root and compost inspection", purpose: "Show whether roots and growing medium support the diagnosis.", required: false },
  ],
  commercialOpportunity: "none",
  claimsToVerify: [
    "Excess moisture can contribute to yellow Monstera foliage.",
    "Insufficient light can change water use and growth.",
    "An occasional older yellow leaf can be part of normal leaf turnover.",
  ],
  editorNotes: ["Do not diagnose from leaf colour alone.", "Keep UK winter light and watering conditions in view."],
};

export const fixtureEvidence: EvidencePack = {
  briefSlug: fixtureBrief.slug,
  researchedAt: "2026-10-07T12:00:00.000Z",
  sources: [
    {
      id: "S1",
      title: "Swiss cheese plant growing guide",
      organisation: "Royal Horticultural Society",
      url: "https://www.rhs.org.uk/plants/swiss-cheese-plant/growing-guide",
      accessedOn: "2026-10-07",
      sourceType: "horticultural-authority",
    },
    {
      id: "S2",
      title: "Houseplant 101: watering houseplants",
      organisation: "Royal Horticultural Society",
      url: "https://www.rhs.org.uk/plants/types/houseplants/houseplant-101",
      accessedOn: "2026-10-07",
      sourceType: "horticultural-authority",
    },
  ],
  claims: [
    {
      claim: "Monstera needs bright but indirect light for healthy indoor growth.",
      sourceIds: ["S1"],
      evidenceSummary: "The RHS growing guidance describes an indoor position with suitable filtered light rather than harsh exposure.",
      confidence: "high",
      requiresOwnerObservation: false,
    },
    {
      claim: "Watering decisions should be based on compost moisture rather than a rigid calendar.",
      sourceIds: ["S1", "S2"],
      evidenceSummary: "The sources describe checking the growing medium and adjusting watering to conditions and plant use.",
      confidence: "high",
      requiresOwnerObservation: false,
    },
    {
      claim: "Persistently wet compost can damage roots and contribute to yellow foliage.",
      sourceIds: ["S1", "S2"],
      evidenceSummary: "Both sources warn against unsuitable watering and poorly drained conditions for indoor plants.",
      confidence: "medium",
      requiresOwnerObservation: true,
    },
    {
      claim: "The pattern and location of yellowing should be considered before choosing a treatment.",
      sourceIds: ["S1"],
      evidenceSummary: "General cultivation requirements support checking the whole growing environment rather than using leaf colour as a single-cause diagnosis.",
      confidence: "medium",
      requiresOwnerObservation: true,
    },
  ],
  conflicts: ["Sources do not provide a single watering interval because indoor conditions differ."],
  prohibitedAssumptions: [
    "Do not assume every yellow leaf means overwatering.",
    "Do not describe a product or treatment as tested by HouseplantLab without a dated observation record.",
  ],
};

export const fixtureDraft: DraftPackage = {
  title: fixtureBrief.title,
  slug: fixtureBrief.slug,
  excerpt: "Yellow Monstera leaves can have several causes. Use the position, watering pattern and condition of the compost and roots to narrow it down safely.",
  metaTitle: "Yellow Monstera Leaves: Causes and Fixes",
  metaDescription: "Find out why Monstera leaves turn yellow, how to check watering, light and roots, and what to change in a typical UK home.",
  openingAnswer: "A yellow Monstera leaf is a symptom rather than a diagnosis. Start by checking how many leaves are affected, whether the compost stays wet, how much light the plant receives and whether the roots smell or feel unhealthy. Change one condition at a time instead of watering, feeding and repotting all at once.",
  sections: [
    {
      heading: "Start with the pattern",
      purpose: "Prevent a one-symptom diagnosis.",
      markdown: "One older leaf turning yellow is different from several leaves changing together. Note whether yellowing begins low on the plant, follows watering, or appears alongside brown patches, limp growth or stalled new leaves. Photograph the whole plant before changing its care so you can compare it over the following weeks.",
      claimSourceIds: ["S1"],
    },
    {
      heading: "Check the watering pattern",
      purpose: "Identify prolonged wetness or repeated drought.",
      markdown: "Feel below the compost surface and check whether excess water can leave the pot. A calendar cannot account for seasonal light, room temperature, pot size and root density. If the compost remains wet for a long period, pause watering and investigate drainage rather than adding more water automatically.",
      claimSourceIds: ["S1", "S2"],
    },
    {
      heading: "Check light and temperature",
      purpose: "Relate water use to the plant's position.",
      markdown: "A Monstera in a darker UK room usually uses water more slowly, particularly in autumn and winter. Move it only after checking for cold glass, radiators and direct midday sun. Aim for a stable position with bright, indirect light and reassess the compost before each watering.",
      claimSourceIds: ["S1"],
    },
    {
      heading: "Inspect the roots when warning signs agree",
      purpose: "Avoid unnecessary repotting while identifying root trouble.",
      markdown: "Do not disturb the root ball for a single ageing leaf. Root inspection becomes more useful when yellowing spreads while the compost stays wet, growth collapses or the pot has an unpleasant smell. Healthy roots are generally firm; soft, damaged material needs careful removal and a clean, freely draining growing medium.",
      claimSourceIds: ["S1", "S2"],
    },
    {
      heading: "Make one correction and observe",
      purpose: "Give the plant time to show whether the diagnosis was right.",
      markdown: "Correct the clearest problem first, record the date and leave healthy green tissue in place. Existing yellow areas will not turn green again, so judge recovery by stable foliage and healthy new growth. Escalate the investigation if yellowing continues or pests, extensive root damage or rapid collapse appear.",
      claimSourceIds: ["S1"],
    },
  ],
  internalLinks: fixtureBrief.relatedArticles,
  photographyPlan: fixtureBrief.photographsRequired,
  affiliateNotes: [],
  disclosures: ["This draft requires factual review and original HouseplantLab photography before publication."],
  publicationStatus: "human-review-required",
};

export const fixtureEditorial: EditorialReport = {
  status: "ready-for-human-review",
  summary: "The draft answers the immediate question, avoids a single-cause diagnosis and keeps every material care claim tied to the evidence pack.",
  findings: [
    {
      severity: "warning",
      category: "photography",
      location: "Entire article",
      message: "Replace the photography plan with dated original HouseplantLab images before publication.",
    },
  ],
  verifiedClaimCount: 4,
  unsupportedClaims: [],
  requiredHumanChecks: [
    "Open every source and confirm that the summaries accurately represent the current page.",
    "Add and approve original photographs showing the symptom and full plant.",
    "Confirm the advice against the actual affected plant before publishing.",
  ],
};

