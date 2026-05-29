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
    return cleanDocuments(await loader.load());
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const loader = new DocxLoader(blob);
    return cleanDocuments(await loader.load());
  }

  // text/plain and text/markdown — no extra dep required
  const text = await blob.text();
  return cleanDocuments([new Document({ pageContent: text })]);
}

// Bullet/list glyphs PDF and DOCX loaders leak into extracted text. Includes the
// Symbol/Wingdings private-use code points Word commonly uses for bullets.
const BULLET_CHARS =
  "\\u2022\\u2023\\u2043\\u204C\\u204D\\u2219\\u25AA\\u25AB\\u25CF\\u25CB\\u25E6\\u00B7\\u2027\\u2218\\uF0A7\\uF0B7\\uF076\\uF0D8\\uF0FC";

// Non-standard space code points: NBSP, the en/em space family, narrow NBSP,
// medium math space, zero-width space, ideographic space, BOM.
const SPACE_CHARS =
  "\\u00A0\\u2000-\\u200B\\u202F\\u205F\\u3000\\uFEFF";

const LEADING_BULLETS = new RegExp(`^[\\s${BULLET_CHARS}]+`);
const ONLY_NOISE = new RegExp(`^[\\s${BULLET_CHARS}]*$`);
const EXOTIC_SPACES = new RegExp(`[${SPACE_CHARS}]`, "g");

// A line that is nothing but a short integer is almost always a page number.
const PAGE_NUMBER = /^\d{1,4}$/;
// Sentence terminators (optionally followed by a closing quote/bracket).
const SENTENCE_END = /[.!?:]["')\]]?$/;

/**
 * Normalizes loader output so chunks hold real content, not layout artifacts:
 * unicode-normalizes, strips bullet glyphs, drops marker-only / page-number
 * lines, reflows soft-wrapped lines back into paragraphs, and collapses
 * runaway whitespace. Documents left empty are removed.
 */
export function cleanDocuments(docs: Document[]): Document[] {
  return docs
    .map(
      (doc) =>
        new Document({
          pageContent: cleanText(doc.pageContent),
          metadata: doc.metadata,
        })
    )
    .filter((doc) => doc.pageContent.length > 0);
}

function cleanText(raw: string): string {
  const lines: string[] = [];
  for (const rawLine of raw.normalize("NFKC").replace(EXOTIC_SPACES, " ").split(/\r?\n/)) {
    const line = rawLine
      .replace(LEADING_BULLETS, "")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (!line || ONLY_NOISE.test(line) || PAGE_NUMBER.test(line)) continue;
    lines.push(line);
  }

  return reflowParagraphs(lines).join("\n\n");
}

/**
 * Merges PDF/DOCX soft-wrapped lines back into single paragraphs. A line is
 * treated as a continuation of the previous one when the previous text did not
 * end a sentence AND the current line either starts lowercase or the previous
 * line ended mid-clause (a trailing comma). Otherwise it starts a new block —
 * which keeps headings and list items on their own lines.
 */
function reflowParagraphs(lines: string[]): string[] {
  const blocks: string[] = [];

  for (const line of lines) {
    const prev = blocks[blocks.length - 1];
    const isContinuation =
      prev !== undefined &&
      !SENTENCE_END.test(prev) &&
      (/^[a-z]/.test(line) || /,$/.test(prev));

    if (isContinuation) {
      blocks[blocks.length - 1] = `${prev} ${line}`;
    } else {
      blocks.push(line);
    }
  }

  return blocks;
}
