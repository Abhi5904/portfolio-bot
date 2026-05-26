import { Queue } from "bullmq";
import { bullConnection } from "./connection";
import { QUEUE_NAMES } from "./queue.constants";

/**
 * BullMQ wiring lives in three places — keep them in sync when adding a queue:
 *   1. Add the name(s) to `queue.constants.ts` (`QUEUE_NAMES` + `JOB_NAMES`).
 *   2. Add a `Queue` instance to `queues` below (producers add jobs through this).
 *   3. Add a `Worker` for it in `worker.ts` (the single worker process).
 *
 * Example (after registering QUEUE_NAMES.EMAIL in queue.constants.ts):
 *   export const queues = {
 *     [QUEUE_NAMES.EMAIL]: new Queue(QUEUE_NAMES.EMAIL, { connection: bullConnection }),
 *   } satisfies Record<string, Queue>;
 */

// One Queue instance per name. Import from here to enqueue jobs.
export const queues = {} satisfies Record<string, Queue>;

// Used by Bull Board to render every registered queue.
export const allQueues = (): Queue[] => Object.values(queues);

// Keep `QUEUE_NAMES` referenced for the doc example above until the first queue
// is registered; remove this once `queues` uses it directly.
void QUEUE_NAMES;

export { bullConnection };
export * from "./queue.constants";
