import path from "node:path";
import { runBlogDesignWorkflow } from "./blog-design-workflow.js";
import { generateBlogDesignImages } from "./blog-design-visuals.js";

const projectRoot = path.resolve(process.cwd());
const design = await runBlogDesignWorkflow(projectRoot);
const visuals = await generateBlogDesignImages(projectRoot, design.outputDirectory);
console.log(JSON.stringify({ ...design, visuals }, null, 2));
