import { Queue, Worker, type Processor, type WorkerOptions } from "bullmq";
import { logger } from "@/shared";
import { bullConnection } from "./connection";
import { QUEUE_NAMES } from "./queue.constants";

export const queues = {
  [QUEUE_NAMES.RAG_PIPELINE]: new Queue(QUEUE_NAMES.RAG_PIPELINE, {
    connection: bullConnection,
  }),
} satisfies Record<string, Queue>;

export const allQueues = (): Queue[] => Object.values(queues);

export function registerWorker<TData, TResult = unknown>(
  name: string,
  processor: Processor<TData, TResult>,
  options?: Omit<WorkerOptions, "connection">
): Worker<TData, TResult> {
  const worker = new Worker<TData, TResult>(name, processor, {
    ...options,
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

export { bullConnection };
export * from "./queue.constants";
