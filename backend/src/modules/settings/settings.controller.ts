import type { Request, Response } from "express";
import { asyncHandler, successResponse, type ValidatedRequest } from "@/shared";
import type { SettingsService } from "./settings.service";
import type { SettingsValidation } from "./settings.validation";

type UpdateSystemPromptRequest = ValidatedRequest<
  InstanceType<typeof SettingsValidation>["updateSystemPrompt"]
>;

export class SettingsController {
  constructor(private service: SettingsService) {}

  getSystemPrompt = asyncHandler(async (_req: Request, res: Response) => {
    const result = await this.service.getSystemPrompt();
    return successResponse(res, "System prompt fetched", result);
  });

  updateSystemPrompt = asyncHandler(
    async (req: UpdateSystemPromptRequest, res: Response) => {
      const result = await this.service.updateSystemPrompt(
        req.validated.body.systemPrompt
      );
      return successResponse(res, "System prompt updated", result);
    }
  );
}
