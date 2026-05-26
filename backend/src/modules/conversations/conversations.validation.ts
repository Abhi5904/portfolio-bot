import { BaseValidator } from "@/shared";
import z from "zod";

export class ConversationsValidation extends BaseValidator {
  list = {
    query: this.paginationQuery().extend({
      search: z.string().optional(),
    }),
  };
}
