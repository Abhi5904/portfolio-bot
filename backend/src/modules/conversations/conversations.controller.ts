import { asyncHandler, type ValidatedRequest } from "@/shared";
import type { Response } from "express";
import type { ConversationsService } from "./conversations.service";
import { ConversationsValidation } from "./conversations.validation";

type ListRequest = ValidatedRequest<
  InstanceType<typeof ConversationsValidation>["list"]
>;

export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  list = asyncHandler(async (req: ListRequest, res: Response) => {
    const result = await this.conversationsService.list(req.validated.query, req.sessionId!);
    res.json({ success: true, data: result });
  });
}
