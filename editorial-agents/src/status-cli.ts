import process from "node:process";
import { summariseQueue } from "./queue.js";

console.log(JSON.stringify(await summariseQueue(process.cwd()), null, 2));

