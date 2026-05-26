import { Router } from "express";
import type { MessagesController } from "./messages.controller";
import { validate } from "@/shared";
import { MessagesValidation } from "./messages.validation";

export class MessagesRoutes {
  public router: Router;
  private validation: MessagesValidation;

  constructor(private messagesController: MessagesController) {
    this.router = Router();
    this.validation = new MessagesValidation();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /conversations
    this.router.get(
      "/:conversationId",
      validate(this.validation.list),
      this.messagesController.list
    );

    // POST /messages
    this.router.post(
      "/",
      validate(this.validation.send),
      this.messagesController.send
    );
  }
}
