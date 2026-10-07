import process from "node:process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { saveBundle } from "./storage.js";
import { runFixtureWorkflow, runLiveWorkflow } from "./workflow.js";

const projectRoot = process.cwd();
const args = new Set(process.argv.slice(2));

const manifestPath = path.join(projectRoot, "content-production", "site-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  existingArticleSlugs: string[];
  allowedInternalPaths: string[];
};
const qualityContext = {
  existingSlugs: manifest.existingArticleSlugs,
  allowedInternalPaths: manifest.allowedInternalPaths,
};

if (args.has("--fixture") === args.has("--live")) {
  console.error("Choose exactly one mode: --fixture or --live");
  process.exitCode = 2;
} else {
  const bundle = args.has("--live") ? await runLiveWorkflow(undefined, qualityContext) : await runFixtureWorkflow(qualityContext);
  const outputDirectory = await saveBundle(projectRoot, bundle);
  console.log(`Editorial run: ${bundle.run.id}`);
  console.log(`Mode: ${bundle.run.mode}`);
  console.log(`Revisions: ${bundle.run.revisionCount}`);
  console.log(`Quality: ${bundle.quality.passed ? "PASSED" : "FAILED"}`);
  console.log(`Output: ${outputDirectory}`);
  if (!bundle.quality.passed) {
    for (const error of bundle.quality.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  }
}

