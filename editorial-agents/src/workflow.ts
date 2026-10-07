import { run } from "@openai/agents";
import { directorAgent, editorAgent, researchAgent, writerAgent } from "./agents.js";
import { runQualityChecks, type QualityContext } from "./checks.js";
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
  const allowedLinks = qualityContext.allowedInternalPaths?.length
    ? qualityContext.allowedInternalPaths.join("\n")
    : "No internal links are currently confirmed.";
  const briefResult = await run(
    directorAgent,
    `${assignment}\nOnly use internal paths from this confirmed site manifest; do not invent future URLs:\n${allowedLinks}`,
  );
  const brief = assertOutput(briefResult.finalOutput, "Director");

  const evidenceResult = await run(
    researchAgent,
    `Research this approved article brief. Return only the evidence pack.\n${JSON.stringify(brief, null, 2)}`,
  );
  const evidence = assertOutput(evidenceResult.finalOutput, "Research");

  const draftResult = await run(
    writerAgent,
    `Write from this approved brief and evidence pack. Return only the draft package.\nCONFIRMED INTERNAL PATHS\n${allowedLinks}\nBRIEF\n${JSON.stringify(brief, null, 2)}\nEVIDENCE\n${JSON.stringify(evidence, null, 2)}`,
  );
  let draft = assertOutput(draftResult.finalOutput, "Writer");

  let editorialResult = await run(
    editorAgent,
    `Audit this package. Return only the editorial report.\nBRIEF\n${JSON.stringify(brief, null, 2)}\nEVIDENCE\n${JSON.stringify(evidence, null, 2)}\nDRAFT\n${JSON.stringify(draft, null, 2)}`,
  );
  let editorial = assertOutput(editorialResult.finalOutput, "Editor");
  const editorialHistory: EditorialReport[] = [editorial];

  if (editorial.status === "revise") {
    const revisionResult = await run(
      writerAgent,
      `Revise the draft to resolve every blocker and unsupported claim in the editorial report. Do not add new claims. Use only confirmed internal paths. Return the complete revised draft package.\nCONFIRMED INTERNAL PATHS\n${allowedLinks}\nBRIEF\n${JSON.stringify(brief, null, 2)}\nEVIDENCE\n${JSON.stringify(evidence, null, 2)}\nCURRENT DRAFT\n${JSON.stringify(draft, null, 2)}\nEDITORIAL REPORT\n${JSON.stringify(editorial, null, 2)}`,
    );
    draft = assertOutput(revisionResult.finalOutput, "Writer revision");
    editorialResult = await run(
      editorAgent,
      `Re-audit the revised package. Return only the editorial report.\nBRIEF\n${JSON.stringify(brief, null, 2)}\nEVIDENCE\n${JSON.stringify(evidence, null, 2)}\nREVISED DRAFT\n${JSON.stringify(draft, null, 2)}`,
    );
    editorial = assertOutput(editorialResult.finalOutput, "Editor revision");
    editorialHistory.push(editorial);
  }

  return buildBundle("live", startedAt, brief, evidence, draft, editorial, editorialHistory, qualityContext);
}

