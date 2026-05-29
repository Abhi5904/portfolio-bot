import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Document } from "@langchain/core/documents";

/**
 * Step 3 of the RAG pipeline — splits a list of LangChain Documents into
 * smaller chunks. Uses RecursiveCharacterTextSplitter so it respects natural
 * language boundaries (paragraphs → sentences → words).
 *
 * splitDocuments() is used (over createDocuments) so that source metadata from
 * the loaders is preserved on every chunk.
 */
export async function chunkDocuments(
  docs: Document[],
  chunkSize: number,
  chunkOverlap: number
): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    // Prefer paragraph breaks, then sentence boundaries, before falling back to
    // single newlines / words. This stops continuous paragraphs from being
    // split at soft line-wraps (cleanText already reflows wraps into "\n\n"
    // separated blocks). keepSeparator avoids dropping the punctuation.
    separators: ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""],
    keepSeparator: true,
  });
  return splitter.splitDocuments(docs);
}
