import { prisma } from "@/config";
import { DEFAULT_SYSTEM_PROMPT } from "@/ai";
import type { SystemPromptResponse } from "./settings.type";

const SYSTEM_PROMPT_KEY = "system_prompt";

export class SettingsService {
  /**
   * Returns the configured system prompt, falling back to the built-in default
   * when the admin has not set one yet.
   */
  async getSystemPrompt(): Promise<SystemPromptResponse> {
    const setting = await prisma.setting.findUnique({
      where: { key: SYSTEM_PROMPT_KEY },
      select: { value: true },
    });

    return setting
      ? { systemPrompt: setting.value, isDefault: false }
      : { systemPrompt: DEFAULT_SYSTEM_PROMPT, isDefault: true };
  }

  /** Resolves just the prompt text — used by the chat retrieval flow. */
  async resolveSystemPrompt(): Promise<string> {
    const { systemPrompt } = await this.getSystemPrompt();
    return systemPrompt;
  }

  async updateSystemPrompt(systemPrompt: string): Promise<SystemPromptResponse> {
    await prisma.setting.upsert({
      where: { key: SYSTEM_PROMPT_KEY },
      update: { value: systemPrompt },
      create: { key: SYSTEM_PROMPT_KEY, value: systemPrompt },
    });

    return { systemPrompt, isDefault: false };
  }
}
