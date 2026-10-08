import { open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialQueueSchema, type EditorialQueue, type QueueItem, type WorkflowBundle } from "./schemas.js";
import { saveBundle } from "./storage.js";
import { runLiveWorkflow } from "./workflow.js";

const LOCK_MAX_AGE_MS = 4 * 60 * 60 * 1000;

export interface SiteManifest {
  existingArticleSlugs: string[];
  allowedInternalPaths: string[];
  minimumArticleWords?: number;
  maximumArticleWords?: number;
  requireClosingSummary?: boolean;
}

export interface AutonomousResult {
  outcome: "ready-for-human-review" | "needs-revision" | "failed" | "no-work" | "daily-limit";
  itemId: string | null;
  runId: string | null;
  outputPath: string | null;
  message: string;
}

export interface AutonomousDependencies {
  now?: () => Date;
  workflow?: typeof runLiveWorkflow;
  persistBundle?: typeof saveBundle;
  ignoreDailyLimit?: boolean;
}

function londonDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function readQueue(queuePath: string): Promise<EditorialQueue> {
  return EditorialQueueSchema.parse(JSON.parse(await readFile(queuePath, "utf8")));
}

async function writeQueue(queuePath: string, queue: EditorialQueue): Promise<void> {
  const temporaryPath = `${queuePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  await rename(temporaryPath, queuePath);
}

function updateItem(queue: EditorialQueue, itemId: string, update: Partial<QueueItem>): EditorialQueue {
  return {
    ...queue,
    items: queue.items.map((item) => (item.id === itemId ? { ...item, ...update } : item)),
  };
}

function chooseNextItem(queue: EditorialQueue): QueueItem | undefined {
  return [...queue.items]
    .filter((item) => item.status === "queued")
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))[0];
}

async function acquireLock(lockPath: string, now: Date): Promise<() => Promise<void>> {
  try {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(`${now.toISOString()}\n`, "utf8");
    await handle.close();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;
    const lockStat = await stat(lockPath);
    if (now.getTime() - lockStat.mtimeMs <= LOCK_MAX_AGE_MS) {
      throw new Error("Another editorial worker is already running.");
    }
    await unlink(lockPath);
    return acquireLock(lockPath, now);
  }
  return async () => {
    await unlink(lockPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  };
}

export async function runAutonomousWorker(
  projectRoot: string,
  dependencies: AutonomousDependencies = {},
): Promise<AutonomousResult> {
  const now = dependencies.now?.() ?? new Date();
  const workflow = dependencies.workflow ?? runLiveWorkflow;
  const persistBundle = dependencies.persistBundle ?? saveBundle;
  const queuePath = path.join(projectRoot, "content-production", "queue", "articles.json");
  const manifestPath = path.join(projectRoot, "content-production", "site-manifest.json");
  const runtimeDirectory = path.join(projectRoot, "content-production", "runtime");
  const lockPath = path.join(runtimeDirectory, "worker.lock");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(runtimeDirectory, { recursive: true }));
  const releaseLock = await acquireLock(lockPath, now);

  try {
    let queue = await readQueue(queuePath);
    const today = londonDate(now);
    const attemptsToday = queue.items.filter(
      (item) => item.lastAttemptAt && londonDate(new Date(item.lastAttemptAt)) === today,
    ).length;
    if (!dependencies.ignoreDailyLimit && attemptsToday >= queue.maxRunsPerDay) {
      return { outcome: "daily-limit", itemId: null, runId: null, outputPath: null, message: "Daily article limit reached." };
    }

    const item = chooseNextItem(queue);
    if (!item) {
      return { outcome: "no-work", itemId: null, runId: null, outputPath: null, message: "No queued article is ready." };
    }

    const startedAt = now.toISOString();
    queue = updateItem(queue, item.id, {
      status: "running",
      attempts: item.attempts + 1,
      updatedAt: startedAt,
      lastAttemptAt: startedAt,
      lastError: null,
    });
    await writeQueue(queuePath, queue);

    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as SiteManifest;
      const bundle = await workflow(item.assignment, {
        existingSlugs: manifest.existingArticleSlugs,
        allowedInternalPaths: manifest.allowedInternalPaths,
        minimumArticleWords: manifest.minimumArticleWords,
        maximumArticleWords: manifest.maximumArticleWords,
        requireClosingSummary: manifest.requireClosingSummary,
      });
      const outputDirectory = await persistBundle(projectRoot, bundle);
      const relativeOutput = path.relative(projectRoot, outputDirectory).replaceAll("\\", "/");
      const outcome = bundle.quality.passed ? "ready-for-human-review" : "needs-revision";
      queue = updateItem(queue, item.id, {
        status: outcome,
        updatedAt: new Date().toISOString(),
        lastRunId: bundle.run.id,
        lastOutputPath: relativeOutput,
        lastError: bundle.quality.passed ? null : bundle.quality.errors.join(" | "),
      });
      await writeQueue(queuePath, queue);
      return {
        outcome,
        itemId: item.id,
        runId: bundle.run.id,
        outputPath: relativeOutput,
        message: bundle.quality.passed ? "Article package is ready for human review." : "Article package needs revision.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      queue = updateItem(queue, item.id, {
        status: "failed",
        updatedAt: new Date().toISOString(),
        lastError: message.slice(0, 1000),
      });
      await writeQueue(queuePath, queue);
      return { outcome: "failed", itemId: item.id, runId: null, outputPath: null, message };
    }
  } finally {
    await releaseLock();
  }
}

export async function summariseQueue(projectRoot: string): Promise<Record<string, unknown>> {
  const queue = await readQueue(path.join(projectRoot, "content-production", "queue", "articles.json"));
  const counts = Object.fromEntries(
    ["queued", "running", "ready-for-human-review", "wordpress-draft", "published", "needs-revision", "failed", "paused"].map((status) => [
      status,
      queue.items.filter((item) => item.status === status).length,
    ]),
  );
  const current = queue.items.find((item) => item.status === "running") ?? null;
  const next = chooseNextItem(queue) ?? null;
  const latest = [...queue.items]
    .filter((item) => item.lastAttemptAt)
    .sort((a, b) => (b.lastAttemptAt ?? "").localeCompare(a.lastAttemptAt ?? ""))[0] ?? null;
  return { counts, current, next, latest, maxRunsPerDay: queue.maxRunsPerDay };
}

