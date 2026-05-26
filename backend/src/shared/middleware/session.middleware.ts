import type { NextFunction, Request, RequestHandler, Response } from "express";

import { prisma } from "@/config";

import { UnauthorizedError } from "../utils/app-error";

// Header the client sends its visitor-session id on.
const SESSION_HEADER = "x-session-id";

/**
 * Guards routes that need a visitor session. Reads the session id from the
 * `x-session-id` header, verifies it maps to a real `VisitorSession`, and
 * stashes the id on `req.sessionId` for downstream handlers/services. Throws
 * 401 when the header is missing or the session is unknown.
 */
export const requireSession: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers[SESSION_HEADER];
    const sessionId = Array.isArray(header) ? header[0] : header;

    if (!sessionId) {
      throw new UnauthorizedError("Session id is required");
    }

    const session = await prisma.visitorSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      throw new UnauthorizedError("Invalid session");
    }

    req.sessionId = session.id;
    next();
  } catch (error) {
    next(error);
  }
};
