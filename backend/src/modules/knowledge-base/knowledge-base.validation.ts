import { z } from "zod";
import { BaseValidator } from "@/shared";

export class KnowledgeBaseValidation extends BaseValidator {
  upload = {
    body: z.object({
      title: z.string().min(1, "Title is required").max(200),
      description: z.string().max(1000).optional(),
      chunkSize: z.coerce.number().int().min(100).max(2000).default(1500),
      chunkOverlap: z.coerce.number().int().min(0).max(500).default(200),
    }),
  };

  byId = {
    params: z.object({
      id: z.uuid("Invalid document ID"),
    }),
  };

  stream = {
    params: z.object({
      id: z.uuid("Invalid document ID"),
    }),
    query: z.object({
      token: z.string().min(1, "SSE token is required"),
    }),
  };
}
