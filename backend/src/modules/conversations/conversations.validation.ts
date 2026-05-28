import { BaseValidator } from "@/shared";
import z from "zod";

export class ConversationsValidation extends BaseValidator {
  list = {
    query: this.validateQuery(
      z.object({
        search: z.string().optional(),
      })
    ),
  };
}
