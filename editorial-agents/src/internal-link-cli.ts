import process from "node:process";
import { runInternalLinkWorkflow } from "./internal-link-workflow.js";

const apply = process.argv.includes("--apply");
const result = await runInternalLinkWorkflow(process.cwd(), { apply, maxSources: 3 });
console.log(JSON.stringify(result, null, 2));
