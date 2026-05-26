import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "@/config/env";
import { AppError } from "../utils";

type ErrorResponse = {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
  stack?: string;
};

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = env.NODE_ENV === "development";

  // Zod validation error
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
      ...(isDev && { stack: err.stack }),
    };
    res.status(400).json(response);
    return;
  }

  // Known operational error (thrown via AppError)
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      message: err.message,
      ...(isDev && { stack: err.stack }),
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown / programmer error — don't leak details in production
  const message =
    isDev && err instanceof Error ? err.message : "Internal server error";

  const response: ErrorResponse = {
    success: false,
    message,
    ...(isDev && err instanceof Error && { stack: err.stack }),
  };

  res.status(500).json(response);
}

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new AppError(404, `Route ${req.originalUrl} not found`);
  next(error);
};
