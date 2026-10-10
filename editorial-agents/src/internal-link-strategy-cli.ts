import process from "node:process";
import { runInternalLinkStrategyWorkflow } from "./internal-link-strategy-workflow.js";

const result = await runInternalLinkStrategyWorkflow(process.cwd());
console.log(JSON.stringify(result, null, 2));
