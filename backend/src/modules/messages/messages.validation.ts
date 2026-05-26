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
    query: this.paginationQuery().extend({
      search: z.string().optional(),
    }),
  };

  send = {
    body: this.validateBody(
      z.object({
        // Optional: omitted when starting a brand-new conversation, in which
        // case the service lazily creates one.
        conversationId: z.uuid().optional(),
        message: z.string().min(1),
      })
    ),
  };
}
