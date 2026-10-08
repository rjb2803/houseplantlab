import process from "node:process";
import { runAutonomousWorker } from "./queue.js";

const force = process.argv.slice(2).includes("--force");
const result = await runAutonomousWorker(process.cwd(), { ignoreDailyLimit: force });
console.log(JSON.stringify(result, null, 2));
if (result.outcome === "failed" || result.outcome === "needs-revision") process.exitCode = 1;

