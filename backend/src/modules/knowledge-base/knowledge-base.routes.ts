import { Router } from "express";
import { requireAdmin, validate, createFileUploadMiddleware } from "@/shared";
import type { KnowledgeBaseController } from "./knowledge-base.controller";
import { KnowledgeBaseValidation } from "./knowledge-base.validation";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const fileUpload = createFileUploadMiddleware({
  fieldName: "file",
  allowedMimeTypes: ACCEPTED_MIME_TYPES,
  maxSizeMb: 50,
  required: true,
});

export class KnowledgeBaseRoutes {
  router = Router();
  private v = new KnowledgeBaseValidation();

  constructor(private controller: KnowledgeBaseController) {
    this.register();
  }

  private register(): void {
    // ── CRUD — all protected by requireAdmin ──────────────────────────────────
    this.router.post(
      "/",
      requireAdmin,
      ...fileUpload,
      validate(this.v.upload),
      this.controller.upload
    );

    this.router.get("/", requireAdmin, this.controller.list);

    this.router.get(
      "/:id",
      requireAdmin,
      validate(this.v.byId),
      this.controller.findById
    );

    this.router.get(
      "/:id/token",
      requireAdmin,
      validate(this.v.byId),
      this.controller.getToken
    );

    this.router.post(
      "/:id/retry",
      requireAdmin,
      validate(this.v.byId),
      this.controller.retry
    );

    this.router.delete(
      "/:id",
      requireAdmin,
      validate(this.v.byId),
      this.controller.delete
    );

    // ── SSE — auth via short-lived query-param token ──────────────────────────
    this.router.get(
      "/:id/stream",
      validate(this.v.stream),
      this.controller.stream
    );
  }
}
