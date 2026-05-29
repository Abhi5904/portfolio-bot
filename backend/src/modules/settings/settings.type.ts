import type { z } from "zod";
import type { SettingsValidation } from "./settings.validation";

export type UpdateSystemPromptBodyDTO = z.infer<
  InstanceType<typeof SettingsValidation>["updateSystemPrompt"]["body"]
>;

export interface SystemPromptResponse {
  systemPrompt: string;
  isDefault: boolean;
}
