import type { JobsOptions } from "bullmq";
import { queues, QUEUE_NAMES } from "@/queues";

const JOB_NAMES = {
  PROCESS: "process",
} as const;

const JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

export type RagPipelineJobData = {
  documentId: string;
};

export async function enqueueRagPipeline(documentId: string): Promise<void> {
  await queues[QUEUE_NAMES.RAG_PIPELINE].add(
    JOB_NAMES.PROCESS,
    { documentId },
    JOB_OPTIONS
  );
}
