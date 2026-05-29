import { OllamaEmbeddings } from "@langchain/ollama";
import type { Document } from "@langchain/core/documents";

import { env } from "@/config";

import { MODELS } from "../ai.constants";

const BATCH_SIZE = 10;

/**
 * Step 4 of the RAG pipeline — generates a vector embedding for each chunk.
 *
 * Documents are sent to Ollama in small batches to avoid overwhelming the
 * local model server. Returns one float array per input Document, in the same
 * order.
 */
export async function embedDocuments(docs: Document[]): Promise<number[][]> {
  const embedder = new OllamaEmbeddings({
    baseUrl: env.OLLAMA_BASE_URL,
    model: MODELS.OLLAMA_EMBED,
  });
  const texts = docs.map((d) => d.pageContent);
  const allVectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const vectors = await embedder.embedDocuments(batch);
    allVectors.push(...vectors);
  }

  return allVectors;
}
