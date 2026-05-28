import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { Document } from "@langchain/core/documents";

import { InternalServerError } from "@/shared";

/**
 * Step 1 — fetches raw bytes from a remote URL (e.g. Cloudinary).
 * Kept separate from parseDocumentBlob so the worker can publish
 * distinct FETCHING / PARSING status events.
 */
export async function fetchDocumentBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new InternalServerError(
      `Failed to fetch document from storage: ${response.statusText}`
    );
  }
  return response.blob();
}

/**
 * Step 2 — parses a Blob into LangChain Documents using the loader
 * that matches the MIME type.
 *
 * PDF  → PDFLoader   (@langchain/community, uses pdf-parse)
 * DOCX → DocxLoader  (@langchain/community, uses mammoth)
 * TXT / MD → plain text extraction, no extra dep needed
 */
export async function parseDocumentBlob(
  blob: Blob,
  mimeType: string
): Promise<Document[]> {
  if (mimeType === "application/pdf") {
    const loader = new PDFLoader(blob, { splitPages: false });
    return loader.load();
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const loader = new DocxLoader(blob);
    return loader.load();
  }

  // text/plain and text/markdown — no extra dep required
  const text = await blob.text();
  return [new Document({ pageContent: text })];
}
