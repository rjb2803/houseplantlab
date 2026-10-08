import path from "node:path";
import { syncReadyDraftToWordPress } from "./publisher.js";

const result = await syncReadyDraftToWordPress(path.resolve(process.cwd()));
console.log(JSON.stringify(result, null, 2));
