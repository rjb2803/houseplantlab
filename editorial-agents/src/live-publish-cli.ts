import path from "node:path";
import { publishDraftWithHero } from "./live-publisher.js";

const result = await publishDraftWithHero(path.resolve(process.cwd()));
console.log(JSON.stringify(result, null, 2));
