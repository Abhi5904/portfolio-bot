import type { z } from "zod";
import type { DocumentStatus, DocumentType, PipelineStep } from "@prisma/client";
import type { KnowledgeBaseValidation } from "./knowledge-base.validation";

// ─── Input DTOs (derived from Zod schemas) ───────────────────────────────────
export type UploadDocumentBodyDTO = z.infer<
  InstanceType<typeof KnowledgeBaseValidation>["upload"]["body"]
>;

export type ByIdParamsDTO = z.infer<
  InstanceType<typeof KnowledgeBaseValidation>["byId"]["params"]
>;

export type StreamParamsDTO = z.infer<
  InstanceType<typeof KnowledgeBaseValidation>["stream"]["params"]
>;

export type StreamQueryDTO = z.infer<
  InstanceType<typeof KnowledgeBaseValidation>["stream"]["query"]
>;

export type DocumentListItem = {
  id: string;
  title: string;
  description: string | null;
  fileType: DocumentType;
  fileSize: number;
  status: DocumentStatus;
  currentStep: PipelineStep | null;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentChunkItem = {
  id: string;
  content: string;
  chunkIndex: number;
  tokenCount: number | null;
  pageNumber: number | null;
  metadata: unknown;
  createdAt: Date;
};

export type DocumentDetail = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: DocumentType;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  currentStep: PipelineStep | null;
  errorMessage: string | null;
  chunkSize: number;
  chunkOverlap: number;
  createdAt: Date;
  updatedAt: Date;
  chunks: DocumentChunkItem[];
};

export type UploadDocumentResponse = {
  documentId: string;
  sseToken: string;
};
