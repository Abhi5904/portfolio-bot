import { SystemMessage, type BaseMessage } from "@langchain/core/messages";

import type { RetrievedChunk } from "../pipeline/retriever";
import { toLangChainMessage, type NormalMessage } from "./message-mapper";

/**
 * Assembles the final message list sent to the LLM for a RAG turn:
 * a system message (configured prompt + retrieved context) followed by the
 * conversation history (which already ends with the user's latest question).
 */
export function buildRagMessages(
  systemPrompt: string,
  retrieved: RetrievedChunk[],
  history: NormalMessage[]
): BaseMessage[] {
  const system = new SystemMessage(buildSystemContent(systemPrompt, retrieved));
  return [system, ...history.map(toLangChainMessage)];
}

function buildSystemContent(
  systemPrompt: string,
  retrieved: RetrievedChunk[]
): string {
  if (retrieved.length === 0) {
    return `${systemPrompt}\n\n---\nContext:\n(No relevant context was found for this question.)`;
  }

  const context = retrieved
    .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
    .join("\n\n");

  return `${systemPrompt}\n\n---\nContext:\n${context}`;
}
