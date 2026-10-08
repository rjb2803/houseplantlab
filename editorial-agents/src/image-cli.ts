import path from "node:path";
import { generateNextArticleImage } from "./image-workflow.js";

const result = await generateNextArticleImage(path.resolve(process.cwd()));
console.log(JSON.stringify(result, null, 2));
