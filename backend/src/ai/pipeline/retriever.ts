import type { Document } from "@langchain/core/documents";

import { RETRIEVAL } from "../ai.constants";
import { similaritySearchWithScore } from "./vector-store";

export interface RetrievedChunk {
  content: string;
  score: number;
  documentId?: string;
  chunkIndex?: number;
}

/**
 * Retrieval step of the RAG pipeline — embeds the user's question, runs a
 * cosine similarity search across all stored chunks, and keeps only those
 * above the relevance threshold. Returns an empty array when nothing is
 * relevant so the caller can decide how to respond.
 */
export async function retrieveContext(
  query: string,
  k: number = RETRIEVAL.K,
  minScore: number = RETRIEVAL.MIN_SCORE
): Promise<RetrievedChunk[]> {
  const results = await similaritySearchWithScore(query, k);

  return results
    .filter(([, score]) => score >= minScore)
    .map(([doc, score]) => toRetrievedChunk(doc, score));
}

function toRetrievedChunk(doc: Document, score: number): RetrievedChunk {
  const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
  return {
    content: doc.pageContent,
    score,
    documentId:
      typeof metadata.document_id === "string"
        ? metadata.document_id
        : undefined,
    chunkIndex:
      typeof metadata.chunk_index === "number"
        ? metadata.chunk_index
        : undefined,
  };
}
