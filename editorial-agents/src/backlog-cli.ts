import path from "node:path";
import { seedNextBacklogItem } from "./backlog.js";

const result = await seedNextBacklogItem(path.resolve(process.cwd()));
console.log(JSON.stringify(result, null, 2));
