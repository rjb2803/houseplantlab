import { fileURLToPath } from "node:url";
import path from "node:path";
import { auditMissingFeaturedImages, repairNextMissingFeaturedImage } from "./missing-image-workflow.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const result = process.argv.includes("--audit-only")
  ? await auditMissingFeaturedImages(projectRoot)
  : await repairNextMissingFeaturedImage(projectRoot);
console.log(JSON.stringify(result, null, 2));
