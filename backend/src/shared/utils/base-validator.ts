import { z } from "zod";
import type { ZodType } from "zod";

export abstract class BaseValidator {
  protected validateBody<T extends ZodType>(schema: T) {
    return schema;
  }

  protected validateQuery<T extends ZodType>(schema: T) {
    return schema;
  }

  protected validateParams<T extends ZodType>(schema: T) {
    return schema;
  }

  protected paginationQuery() {
    return z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
    });
  }
}
