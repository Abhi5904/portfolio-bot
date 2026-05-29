import { Router } from "express";
import { requireAdmin, validate } from "@/shared";
import type { SettingsController } from "./settings.controller";
import { SettingsValidation } from "./settings.validation";

export class SettingsRoutes {
  router = Router();
  private v = new SettingsValidation();

  constructor(private controller: SettingsController) {
    this.register();
  }

  private register(): void {
    this.router.get(
      "/system-prompt",
      requireAdmin,
      this.controller.getSystemPrompt
    );

    this.router.put(
      "/system-prompt",
      requireAdmin,
      validate(this.v.updateSystemPrompt),
      this.controller.updateSystemPrompt
    );
  }
}
