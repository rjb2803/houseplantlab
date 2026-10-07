import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowBundle } from "./schemas.js";

export async function saveBundle(projectRoot: string, bundle: WorkflowBundle): Promise<string> {
  const outputDirectory = path.join(projectRoot, "content-production", "runs", bundle.run.id);
  await mkdir(outputDirectory, { recursive: true });

  const files: Array<[string, unknown]> = [
    ["brief.json", bundle.brief],
    ["evidence.json", bundle.evidence],
    ["draft.json", bundle.draft],
    ["editorial-report.json", bundle.editorial],
    ["editorial-history.json", bundle.editorialHistory],
    ["quality-report.json", bundle.quality],
    ["bundle.json", bundle],
  ];

  await Promise.all(
    files.map(([filename, value]) =>
      writeFile(path.join(outputDirectory, filename), `${JSON.stringify(value, null, 2)}\n`, "utf8"),
    ),
  );

  const markdown = [
    `# ${bundle.draft.title}`,
    "",
    `> ${bundle.draft.excerpt}`,
    "",
    bundle.draft.openingAnswer,
    "",
    ...bundle.draft.sections.flatMap((section) => [
      `## ${section.heading}`,
      "",
      section.markdown,
      "",
      section.claimSourceIds.length ? `Evidence: ${section.claimSourceIds.join(", ")}` : "Evidence: none",
      "",
    ]),
    "## Human review gate",
    "",
    ...bundle.editorial.requiredHumanChecks.map((item) => `- ${item}`),
    "",
    `Quality checks: ${bundle.quality.passed ? "PASSED" : "FAILED"}`,
    "",
  ].join("\n");

  await writeFile(path.join(outputDirectory, "preview.md"), markdown, "utf8");
  return outputDirectory;
}

