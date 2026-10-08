import process from "node:process";
import { runAutonomousWorker } from "./queue.js";

const result = await runAutonomousWorker(process.cwd());
console.log(JSON.stringify(result, null, 2));
if (result.outcome === "failed" || result.outcome === "needs-revision") process.exitCode = 1;

