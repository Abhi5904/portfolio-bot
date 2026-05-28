import { BaseValidator } from "@/shared";
import z from "zod";

export class MessagesValidation extends BaseValidator {
  private conversationIdParams = this.validateParams(
    z.object({
      conversationId: z.uuid(),
    })
  );

  list = {
    params: this.conversationIdParams,
    query: this.validateQuery(
      z.object({
        search: z.string().optional(),
      })
    ),
  };

  send = {
    body: this.validateBody(
      z.object({
        conversationId: z.uuid().optional(),
        message: z.string().min(1),
      })
    ),
  };
}
