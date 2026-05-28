import type { Request, Response } from "express";
import {
  asyncHandler,
  NotFoundError,
  successResponse,
  type ValidatedRequest,
} from "@/shared";
import type { KnowledgeBaseService } from "./knowledge-base.service";
import type { KnowledgeBaseValidation } from "./knowledge-base.validation";

type ByIdRequest = ValidatedRequest<
  InstanceType<typeof KnowledgeBaseValidation>["byId"]
>;
type UploadRequest = ValidatedRequest<
  InstanceType<typeof KnowledgeBaseValidation>["upload"]
> & {
  file?: Express.Multer.File;
};
type StreamRequest = ValidatedRequest<
  InstanceType<typeof KnowledgeBaseValidation>["stream"]
>;

export class KnowledgeBaseController {
  constructor(private service: KnowledgeBaseService) {}

  upload = asyncHandler(async (req: UploadRequest, res: Response) => {
    if (!req.file) {
      throw new NotFoundError("File is required");
    }
    const result = await this.service.upload(req.file, req.validated.body);
    return successResponse(res, "Document uploaded", result);
  });

  list = asyncHandler(async (_req: Request, res: Response) => {
    const result = await this.service.list();
    return successResponse(res, "Documents fetched", result);
  });

  findById = asyncHandler(async (req: ByIdRequest, res: Response) => {
    const { id } = req.validated.params;
    const result = await this.service.findById(id);
    return successResponse(res, "Document fetched", result);
  });

  delete = asyncHandler(async (req: ByIdRequest, res: Response) => {
    const { id } = req.validated.params as { id: string };
    await this.service.delete(id);
    return successResponse(res, "Document deleted");
  });

  stream = asyncHandler(async (req: StreamRequest, res: Response) => {
    const { id } = req.validated.params;
    const { token } = req.validated.query;
    await this.service.stream(req, res, id, token);
  });
}
