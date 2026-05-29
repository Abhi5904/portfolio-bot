import { PGVectorStore } from "@langchain/pgvector";
import type { DistanceStrategy, MetadataFilter } from "@langchain/pgvector";
import type { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { OllamaEmbeddings } from "@langchain/ollama";
import type { PoolConfig } from "pg";

import { env, prisma } from "@/config";
import { MODELS } from "../ai.constants";

// PGVectorStore is mapped to the existing document_chunks table.
// The metadata JSONB column carries document_id + chunk_index so
// similaritySearch filters work without an extra join.
const PG_STORE_CONFIG = {
  postgresConnectionOptions: {
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  } as PoolConfig,
  tableName: "document_chunks",
  columns: {
    idColumnName: "id",
    vectorColumnName: "embedding",
    contentColumnName: "content",
    metadataColumnName: "metadata",
  },
  distanceStrategy: "cosine" as DistanceStrategy,
  // Return normalized similarity (0–1, higher = more similar) from
  // similaritySearchWithScore instead of the raw cosine distance.
  scoreNormalization: "similarity" as const,
};

function buildEmbedder(): OllamaEmbeddings {
  return new OllamaEmbeddings({
    baseUrl: env.OLLAMA_BASE_URL,
    model: MODELS.OLLAMA_EMBED,
  });
}

/**
 * Returns a PGVectorStore instance bound to the document_chunks table.
 * Caller is responsible for calling store.end() to release the pg pool.
 */
export async function createVectorStore(
  embeddings: EmbeddingsInterface
): Promise<PGVectorStore> {
  return new PGVectorStore(embeddings, PG_STORE_CONFIG);
}

/**
 * Step 5 — persists chunks and their pre-computed embeddings.
 *
 * Why raw SQL instead of store.addDocuments():
 *   PGVectorStore.addDocuments() inserts only (id, content, metadata, embedding).
 *   Our document_chunks table has a NOT NULL FK column `document_id` that
 *   PGVectorStore's generic INSERT does not include, so addDocuments() would
 *   throw a NOT NULL constraint violation.
 *
 * document_id is also written into the metadata JSONB so that
 * similaritySearch can filter by { document_id } without a join.
 */
export async function storeChunks(
  documentId: string,
  chunks: Document[],
  vectors: number[][]
): Promise<void> {
  if (chunks.length !== vectors.length) {
    throw new Error(
      `Chunk/vector count mismatch: ${chunks.length} chunks, ${vectors.length} vectors`
    );
  }

  for (let i = 0; i < chunks.length; i++) {
    const id = crypto.randomUUID();
    const content = chunks[i]?.pageContent ?? "";
    const vector = vectors[i];
    if (!vector) throw new Error(`Missing embedding for chunk ${i}`);
    const vectorStr = `[${vector.join(",")}]`;
    const metadata = JSON.stringify({ document_id: documentId, chunk_index: i });

    await prisma.$executeRaw`
      INSERT INTO document_chunks (id, document_id, content, chunk_index, embedding, metadata, created_at)
      VALUES (
        ${id}::uuid,
        ${documentId}::uuid,
        ${content},
        ${i},
        ${vectorStr}::vector,
        ${metadata}::jsonb,
        NOW()
      )
    `;
  }
}

/**
 * Cosine-similarity search using PGVectorStore's built-in method.
 * The store embeds the query text with OllamaEmbeddings and runs:
 *   SELECT ... ORDER BY embedding <=> $query_vector LIMIT k
 *
 * Use filter to scope results to a specific document:
 *   similaritySearch("tell me about X", 5, { document_id: "uuid" })
 */
export async function similaritySearch(
  query: string,
  k = 5,
  filter?: MetadataFilter
): Promise<Document[]> {
  const store = await createVectorStore(buildEmbedder());
  try {
    return await store.similaritySearch(query, k, filter);
  } finally {
    await store.end();
  }
}

/**
 * Similarity search with normalized relevance scores. Because the store is
 * configured with scoreNormalization "similarity", each score is in [0, 1]
 * where higher means more similar — callers can threshold by confidence.
 */
export async function similaritySearchWithScore(
  query: string,
  k = 5,
  filter?: MetadataFilter
): Promise<[Document, number][]> {
  const store = await createVectorStore(buildEmbedder());
  try {
    return await store.similaritySearchWithScore(query, k, filter);
  } finally {
    await store.end();
  }
}

/**
 * Deletes all chunks for a document using PGVectorStore's built-in
 * delete({ ids }) method. Chunk IDs are fetched from Prisma first,
 * then passed to the store so it can issue the DELETE via its own pool.
 *
 * Prisma's cascade delete also handles this when the parent Document
 * record is deleted, but this function is needed for re-upload flows
 * where the document row stays but chunks must be replaced.
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const rows = await prisma.documentChunk.findMany({
    where: { documentId },
    select: { id: true },
  });

  if (rows.length === 0) return;

  const store = await createVectorStore(buildEmbedder());
  try {
    await store.delete({ ids: rows.map((r) => r.id) });
  } finally {
    await store.end();
  }
}
