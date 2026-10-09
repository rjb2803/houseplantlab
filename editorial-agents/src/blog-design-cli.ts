import path from "node:path";
import { runBlogDesignWorkflow } from "./blog-design-workflow.js";

const result = await runBlogDesignWorkflow(path.resolve(process.cwd()));
console.log(JSON.stringify(result, null, 2));
