import { asyncHandler, successResponse, type ValidatedRequest } from "@/shared";
import type { Response } from "express";
import type { MessagesService } from "./messages.service";
import { MessagesValidation } from "./messages.validation";

type ListRequest = ValidatedRequest<
  InstanceType<typeof MessagesValidation>["list"]
>;

type SendRequest = ValidatedRequest<
  InstanceType<typeof MessagesValidation>["send"]
>;

export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  list = asyncHandler(async (req: ListRequest, res: Response) => {
    const result = await this.messagesService.list(
      req.validated.query,
      req.validated.params
    );
    return successResponse(res, "Messages fetched successfully", result);
  });

  send = asyncHandler(async (req: SendRequest, res: Response) => {
    await this.messagesService.send(req.validated.body, res, req.sessionId!);
  });
}
