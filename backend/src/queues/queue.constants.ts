export const QUEUE_NAMES = {
  RAG_PIPELINE: "rag-pipeline",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const RAG_PIPELINE_CHANNEL = (documentId: string) =>
  `rag:pipeline:${documentId}`;
