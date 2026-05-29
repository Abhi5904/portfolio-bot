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
  const queue = queues[QUEUE_NAMES.RAG_PIPELINE];

  // Clean up any existing job with the same ID (failed, completed, or active)
  const existingJob = await queue.getJob(documentId);
  if (existingJob) {
    await existingJob.remove();
  }

  await queue.add(
    JOB_NAMES.PROCESS,
    { documentId },
    {
      ...JOB_OPTIONS,
      jobId: documentId,
    }
  );
}
