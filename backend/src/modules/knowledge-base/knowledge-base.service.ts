import { DocumentType } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "@/config";
import { signSseToken, NotFoundError, verifySseToken, redisPubSub } from "@/shared";
import { RAG_PIPELINE_CHANNEL } from "@/queues";
import { enqueueRagPipeline } from "./knowledge-base.jobs";
import type { CloudinaryService } from "@/shared/services/cloudinary.service";
import type {
  DocumentDetail,
  DocumentListItem,
  UploadDocumentBodyDTO,
  UploadDocumentResponse,
} from "./knowledge-base.type";

const MIME_TO_TYPE: Record<string, DocumentType> = {
  "application/pdf": DocumentType.PDF,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocumentType.DOCX,
  "text/plain": DocumentType.TXT,
  "text/markdown": DocumentType.MD,
};

export class KnowledgeBaseService {
  constructor(private cloudinary: CloudinaryService) {}

  async upload(
    file: Express.Multer.File,
    body: UploadDocumentBodyDTO
  ): Promise<UploadDocumentResponse> {
    const fileType = MIME_TO_TYPE[file.mimetype];
    if (!fileType) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    const { url, publicId } = await this.cloudinary.uploadDoc(
      file.buffer,
      file.originalname
    );

    const document = await prisma.document.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        fileUrl: url,
        cloudinaryPublicId: publicId,
        fileType,
        mimeType: file.mimetype,
        fileSize: file.size,
        chunkSize: body.chunkSize ?? 500,
        chunkOverlap: body.chunkOverlap ?? 50,
      },
    });

    await enqueueRagPipeline(document.id);

    const sseToken = await signSseToken(document.id);

    return { documentId: document.id, sseToken };
  }

  async list(): Promise<DocumentListItem[]> {
    const docs = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    });

    return docs.map(({ _count, ...doc }) => ({
      ...doc,
      chunkCount: _count.chunks,
    }));
  }

  async findById(id: string): Promise<DocumentDetail> {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { chunkIndex: "asc" },
          select: {
            id: true,
            content: true,
            chunkIndex: true,
            tokenCount: true,
            pageNumber: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!doc) throw new NotFoundError("Document not found");

    return doc;
  }

  async stream(req: Request, res: Response, id: string, token: string): Promise<void> {
    let documentId: string;
    try {
      ({ documentId } = await verifySseToken(token));
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    if (documentId !== id) {
      res.status(403).json({ error: "Token does not match document" });
      return;
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { status: true, currentStep: true, errorMessage: true },
    });

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    if (doc.status === "DONE" || doc.status === "FAILED") {
      send({
        step: doc.currentStep,
        message: doc.status === "DONE" ? "Pipeline already completed." : "Pipeline previously failed.",
        error: doc.errorMessage ?? undefined,
        done: true,
      });
      res.end();
      return;
    }

    if (doc.currentStep) {
      send({ step: doc.currentStep, message: "Pipeline in progress..." });
    }

    const channel = RAG_PIPELINE_CHANNEL(documentId);
    const cleanup = await redisPubSub.subscribe<{ done?: boolean }>(channel, (event) => {
      send(event);
      if (event.done) {
        void cleanup().then(() => res.end());
      }
    });

    req.on("close", () => void cleanup());
  }

  async delete(id: string): Promise<void> {
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, cloudinaryPublicId: true },
    });
    if (!doc) throw new NotFoundError("Document not found");

    // Remove DB record first; cascade deletes DocumentChunks automatically
    await prisma.document.delete({ where: { id } });

    // Best-effort Cloudinary cleanup — don't fail the request if it errors
    if (doc.cloudinaryPublicId) {
      await this.cloudinary.deleteDoc(doc.cloudinaryPublicId).catch(() => {});
    }
  }
}
