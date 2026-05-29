import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils";

// Logs one line per request once the response is sent, picking the log level
// from the status code (5xx → error, 4xx → warn, else info).
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.originalUrl.startsWith("/admin/queues")) {
    return next();
  }
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`;

    if (res.statusCode >= 500) {
      logger.error(line);
    } else if (res.statusCode >= 400) {
      logger.warn(line);
    } else {
      logger.info(line);
    }
  });

  next();
};
