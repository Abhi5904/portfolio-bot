import { BaseValidator } from "@/shared";
import z from "zod";

export class SettingsValidation extends BaseValidator {
  updateSystemPrompt = {
    body: this.validateBody(
      z.object({
        systemPrompt: z
          .string()
          .min(1, "System prompt is required")
          .max(8000, "System prompt is too long"),
      })
    ),
  };
}
