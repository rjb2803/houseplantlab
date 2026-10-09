import { run } from "@openai/agents";
import { directorAgent, editorAgent, researchAgent, writerAgent } from "./agents.js";
import { countReaderWords, draftHasVisibleReferences, runQualityChecks, type QualityContext } from "./checks.js";
import { fixtureBrief, fixtureDraft, fixtureEditorial, fixtureEvidence } from "./fixture.js";
import {
  WorkflowBundleSchema,
  type ArticleBrief,
  type DraftPackage,
  type EditorialReport,
  type EvidencePack,
  type WorkflowBundle,
} from "./schemas.js";

function assertOutput<T>(value: T | undefined, stage: string): T {
  if (value === undefined) throw new Error(`${stage} agent completed without a final output.`);
  return value;
}

interface DraftRepairContext {
  currentDate: string;
  allowedLinks: string;
  brief: ArticleBrief;
  evidence: EvidencePack;
  targetMinimumWords: number;
  targetMaximumWords: number;
}

async function repairDraftPreflight(
  draft: DraftPackage,
  context: DraftRepairContext,
  phase: string,
): Promise<DraftPackage> {
  let repairedDraft = draft;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const readerWordCount = countReaderWords(repairedDraft);
    const visibleReferences = draftHasVisibleReferences(repairedDraft);
    if (readerWordCount >= context.targetMinimumWords && !visibleReferences) return repairedDraft;

    const issues = [
      readerWordCount < context.targetMinimumWords
        ? `The current reader-facing copy is ${readerWordCount} words. Expand it to ${context.targetMinimumWords}-${context.targetMaximumWords} useful words.`
        : null,
      visibleReferences
        ? "Remove every reader-facing source ID, citation marker, Evidence or Sources line, evidence-pack reference and source commentary. Keep traceability only in claimSourceIds."
        : null,
    ].filter(Boolean).join("\n");

    const repairResult = await run(
      writerAgent,
      `Current date: ${context.currentDate}. This is ${phase} preflight repair ${attempt} of 2.\n${issues}\nPreserve supported practical detail and the article's natural editorial flow. Add useful distinctions, diagnostic checks, seasonal context and safe next steps supported by the existing evidence; do not pad, repeat or invent claims. The final section must remain "In summary" with 100-220 words. Return the complete corrected draft package only.\nCONFIRMED INTERNAL PATHS\n${context.allowedLinks}\nBRIEF\n${JSON.stringify(context.brief, null, 2)}\nEVIDENCE\n${JSON.stringify(context.evidence, null, 2)}\nCURRENT DRAFT\n${JSON.stringify(repairedDraft, null, 2)}`,
    );
    repairedDraft = assertOutput(repairResult.finalOutput, "Writer preflight repair");
  }
  return repairedDraft;
}

function buildBundle(
  mode: "fixture" | "live",
  startedAt: string,
  brief: ArticleBrief,
  evidence: EvidencePack,
  draft: DraftPackage,
  editorial: EditorialReport,
  editorialHistory: EditorialReport[],
  qualityContext: QualityContext,
): WorkflowBundle {
  const quality = runQualityChecks(brief, evidence, draft, editorial, qualityContext);
  const runId = `${mode}-${brief.slug}-${startedAt.replace(/[:.]/g, "-")}`;

  return WorkflowBundleSchema.parse({
    run: {
      id: runId,
      mode,
      startedAt,
      completedAt: new Date().toISOString(),
      revisionCount: Math.max(0, editorialHistory.length - 1),
    },
    brief,
    evidence,
    draft,
    editorial,
    editorialHistory,
    quality,
  });
}

export async function runFixtureWorkflow(qualityContext: QualityContext = {}): Promise<WorkflowBundle> {
  const startedAt = new Date().toISOString();
  return buildBundle("fixture", startedAt, fixtureBrief, fixtureEvidence, fixtureDraft, fixtureEditorial, [fixtureEditorial], qualityContext);
}

export async function runLiveWorkflow(
  assignment = "Create an article package answering why Monstera deliciosa leaves turn yellow in UK homes.",
  qualityContext: QualityContext = {},
): Promise<WorkflowBundle> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is required for --live mode. Fixture mode does not require a key.");
  }

  const startedAt = new Date().toISOString();
  const currentDate = startedAt.slice(0, 10);
  const allowedLinks = qualityContext.allowedInternalPaths?.length
    ? qualityContext.allowedInternalPaths.join("\n")
    : "No internal links are currently confirmed.";
  const minimumArticleWords = qualityContext.minimumArticleWords ?? 1300;
  const maximumArticleWords = qualityContext.maximumArticleWords ?? 1900;
  const targetMinimumWords = Math.min(maximumArticleWords, Math.max(1550, minimumArticleWords + 250));
  const targetMaximumWords = Math.max(targetMinimumWords, Math.min(maximumArticleWords, 1800));
  const briefResult = await run(
    directorAgent,
    `Current date: ${currentDate}.\n${assignment}\nOnly use internal paths from this confirmed site manifest; do not invent future URLs:\n${allowedLinks}`,
  );
  const brief = assertOutput(briefResult.finalOutput, "Director");

  const evidenceResult = await run(
    researchAgent,
    `Current date: ${currentDate}. Research this approved article brief. Return only the evidence pack.\n${JSON.stringify(brief, null, 2)}`,
  );
  const evidence = assertOutput(evidenceResult.finalOutput, "Research");

  const draftResult = await run(
    writerAgent,
    `Write from this approved brief and evidence pack. The finished reader-facing copy must contain ${targetMinimumWords}-${targetMaximumWords} useful words, excluding metadata. Return only the draft package.\nCONFIRMED INTERNAL PATHS\n${allowedLinks}\nBRIEF\n${JSON.stringify(brief, null, 2)}\nEVIDENCE\n${JSON.stringify(evidence, null, 2)}`,
  );
  let draft = assertOutput(draftResult.finalOutput, "Writer");
  const repairContext: DraftRepairContext = {
    currentDate,
    allowedLinks,
    brief,
    evidence,
    targetMinimumWords,
    targetMaximumWords,
  };
  draft = await repairDraftPreflight(draft, repairContext, "initial draft");

  let editorialResult = await run(
    editorAgent,
    `Audit this package. The measured reader-facing word count is ${countReaderWords(draft)}; the publication minimum is ${minimumArticleWords}. Return only the editorial report.\nBRIEF\n${JSON.stringify(brief, null, 2)}\nEVIDENCE\n${JSON.stringify(evidence, null, 2)}\nDRAFT\n${JSON.stringify(draft, null, 2)}`,
  );
  let editorial = assertOutput(editorialResult.finalOutput, "Editor");
  const editorialHistory: EditorialReport[] = [editorial];

  for (let revisionNumber = 1; editorial.status === "revise" && revisionNumber <= 3; revisionNumber += 1) {
    const currentWordCount = countReaderWords(draft);
    const revisionResult = await run(
      writerAgent,
      `Current date: ${currentDate}. This is correction round ${revisionNumber} of 3. The current reader-facing copy is ${currentWordCount} words; the corrected article must finish at ${targetMinimumWords}-${targetMaximumWords} useful words. Revise the draft to resolve every blocker and unsupported claim in the editorial report. Remove unsupported claims, then replace lost length with supported practical detail, distinctions, diagnostic checks and safe next steps from the existing evidence. Do not add new claims, padding or repetition. Never expose source IDs or evidence commentary in reader-facing fields. Never recommend a plant-protection product without exact evidence for its current UK-authorised use, target problem and label requirements. Use only confirmed internal paths. Return the complete revised draft package.\nCONFIRMED INTERNAL PATHS\n${allowedLinks}\nBRIEF\n${JSON.stringify(brief, null, 2)}\nEVIDENCE\n${JSON.stringify(evidence, null, 2)}\nCURRENT DRAFT\n${JSON.stringify(draft, null, 2)}\nEDITORIAL REPORT\n${JSON.stringify(editorial, null, 2)}`,
    );
    draft = assertOutput(revisionResult.finalOutput, "Writer revision");
    draft = await repairDraftPreflight(draft, repairContext, `revision ${revisionNumber}`);
    editorialResult = await run(
      editorAgent,
      `Current date: ${currentDate}. Re-audit the revised package. The measured reader-facing word count is ${countReaderWords(draft)}; the publication minimum is ${minimumArticleWords}. Return only the editorial report.\nBRIEF\n${JSON.stringify(brief, null, 2)}\nEVIDENCE\n${JSON.stringify(evidence, null, 2)}\nREVISED DRAFT\n${JSON.stringify(draft, null, 2)}`,
    );
    editorial = assertOutput(editorialResult.finalOutput, "Editor revision");
    editorialHistory.push(editorial);
  }

  return buildBundle("live", startedAt, brief, evidence, draft, editorial, editorialHistory, qualityContext);
}

