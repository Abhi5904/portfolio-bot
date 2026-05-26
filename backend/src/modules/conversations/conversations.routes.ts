import { Router } from "express";
import type { ConversationsController } from "./conversations.controller";
import { ConversationsValidation } from "./conversations.validation";
import { validate } from "@/shared";

export class ConversationsRoutes {
  public router: Router;
  private validation: ConversationsValidation;

  constructor(private conversationsController: ConversationsController) {
    this.router = Router();
    this.validation = new ConversationsValidation();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /conversations
    this.router.get(
      "/",
      validate(this.validation.list),
      this.conversationsController.list
    );
  }
}
