import path from "node:path";
import { runSeoPlanningWorkflow } from "./seo-workflow.js";

const result = await runSeoPlanningWorkflow(path.resolve(process.cwd()));
console.log(JSON.stringify(result, null, 2));
