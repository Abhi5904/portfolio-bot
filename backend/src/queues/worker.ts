import { Worker, type Processor } from "bullmq";
import { logger } from "@/shared";
import { bullConnection } from "./connection";

/**
 * Single worker process — every worker is defined here.
 *
 * Run with `npm run worker:dev` (watch) or `npm run worker` (built).
 * To add a worker: `registerWorker(QUEUE_NAMES.X, async (job) => { ... })`,
 * branching on `job.name` (compared against `JOB_NAMES.X.*`) when a queue
 * carries more than one job type.
 */
function registerWorker<TData, TResult = unknown>(
  name: string,
  processor: Processor<TData, TResult>
): Worker<TData, TResult> {
  const worker = new Worker<TData, TResult>(name, processor, {
    connection: bullConnection,
  });

  worker.on("completed", (job) =>
    logger.info(`[worker:${name}] job ${job.id} completed`)
  );
  worker.on("failed", (job, err) =>
    logger.error(`[worker:${name}] job ${job?.id ?? "?"} failed`, err.message)
  );
  worker.on("error", (err) =>
    logger.error(`[worker:${name}] error`, err.message)
  );

  return worker;
}

// ─── Register all workers here ────────────────────────────────────────────────
const workers: Worker[] = [
  // registerWorker(QUEUE_NAMES.EMAIL, async (job) => {
  //   switch (job.name) {
  //     case JOB_NAMES.EMAIL.WELCOME: return sendWelcome(job.data);
  //   }
  // }),
];

logger.info(`🛠  Worker process started — ${workers.length} worker(s) active`);

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received — closing workers...`);
  await Promise.all(workers.map((worker) => worker.close()));
  await bullConnection.quit();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
