import type { Request } from "express";
import type { ZodType, infer as zInfer } from "zod";

export type ValidationSchemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export type InferBody<T extends ValidationSchemas> = T["body"] extends ZodType
  ? zInfer<T["body"]>
  : unknown;

export type InferQuery<T extends ValidationSchemas> = T["query"] extends ZodType
  ? zInfer<T["query"]>
  : unknown;

export type InferParams<T extends ValidationSchemas> =
  T["params"] extends ZodType ? zInfer<T["params"]> : unknown;

export type ValidatedRequest<T extends ValidationSchemas> = Request & {
  validated: {
    body: InferBody<T>;
    query: InferQuery<T>;
    params: InferParams<T>;
  };
};
