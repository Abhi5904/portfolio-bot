import { DocumentStatus, PipelineStep } from "@prisma/client";
import type { Job, Worker, WorkerOptions } from "bullmq";

import { prisma } from "@/config";
import { logger, redisPubSub } from "@/shared";
import { registerWorker, QUEUE_NAMES, RAG_PIPELINE_CHANNEL } from "@/queues";
import {
  fetchDocumentBlob,
  parseDocumentBlob,
  chunkDocuments,
  embedDocuments,
  storeChunks,
} from "@/ai";
import type { RagPipelineJobData } from "./knowledge-base.jobs";

type PipelineEvent = {
  step: PipelineStep;
  message: string;
  done?: boolean;
  error?: string;
};

async function publish(
  documentId: string,
  event: PipelineEvent
): Promise<void> {
  await redisPubSub.publish(RAG_PIPELINE_CHANNEL(documentId), event);
}

async function updateStep(
  documentId: string,
  step: PipelineStep,
  status: DocumentStatus = DocumentStatus.PROCESSING,
  errorMessage?: string
): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: { currentStep: step, status, errorMessage: errorMessage ?? null },
  });
}

// ─── Pipeline orchestrator ────────────────────────────────────────────────────
async function process(job: Job<RagPipelineJobData>): Promise<void> {
  const { documentId } = job.data;

  try {
    const doc = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });

    // FETCHING ─────────────────────────────────────────────────────────────────
    await updateStep(documentId, PipelineStep.FETCHING);
    await publish(documentId, {
      step: PipelineStep.FETCHING,
      message: "Fetching document from storage...",
    });

    const blob = await fetchDocumentBlob(doc.fileUrl);

    // PARSING ──────────────────────────────────────────────────────────────────
    await updateStep(documentId, PipelineStep.PARSING);
    await publish(documentId, {
      step: PipelineStep.PARSING,
      message: "Extracting text from document...",
    });

    const rawDocs = await parseDocumentBlob(blob, doc.mimeType);
    const hasContent = rawDocs.some((d) => d.pageContent.trim().length > 0);
    if (!hasContent) throw new Error("No extractable text found in document");

    // CHUNKING ─────────────────────────────────────────────────────────────────
    await updateStep(documentId, PipelineStep.CHUNKING);
    await publish(documentId, {
      step: PipelineStep.CHUNKING,
      message: "Splitting document into chunks...",
    });

    const chunks = await chunkDocuments(rawDocs, doc.chunkSize, doc.chunkOverlap);

    // EMBEDDING ────────────────────────────────────────────────────────────────
    await updateStep(documentId, PipelineStep.EMBEDDING);
    await publish(documentId, {
      step: PipelineStep.EMBEDDING,
      message: `Generating embeddings for ${chunks.length} chunks...`,
    });

    const vectors = await embedDocuments(chunks);

    // STORING ──────────────────────────────────────────────────────────────────
    await updateStep(documentId, PipelineStep.STORING);
    await publish(documentId, {
      step: PipelineStep.STORING,
      message: "Storing chunks and vectors in database...",
    });

    await storeChunks(documentId, chunks, vectors);

    // DONE ─────────────────────────────────────────────────────────────────────
    await updateStep(documentId, PipelineStep.COMPLETED, DocumentStatus.DONE);
    await publish(documentId, {
      step: PipelineStep.COMPLETED,
      message: `Done. ${chunks.length} chunks stored.`,
      done: true,
    });

    logger.info(
      `[rag-pipeline] document ${documentId} — ${chunks.length} chunks stored`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[rag-pipeline] document ${documentId} failed: ${message}`);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.FAILED,
        currentStep: PipelineStep.FAILED,
        errorMessage: message,
      },
    });

    await publish(documentId, {
      step: PipelineStep.FAILED,
      message: "Pipeline failed.",
      error: message,
      done: true,
    });
  }
}

const WORKER_OPTIONS: Omit<WorkerOptions, "connection"> = {
  concurrency: 2,
};

export function register(): Worker {
  return registerWorker<RagPipelineJobData>(
    QUEUE_NAMES.RAG_PIPELINE,
    async (job) => {
      await process(job);
    },
    WORKER_OPTIONS
  );
}
