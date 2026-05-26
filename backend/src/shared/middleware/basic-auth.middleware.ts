import type { NextFunction, Request, RequestHandler, Response } from "express";
import { timingSafeEqual } from "node:crypto";

type BasicAuthOptions = {
  user: string;
  password: string;
  realm?: string;
};

// Constant-time string compare so we don't leak length/content via timing.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Minimal HTTP Basic Auth guard — no extra dependency.
export const basicAuth = ({
  user,
  password,
  realm = "Restricted",
}: BasicAuthOptions): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;

    if (header?.startsWith("Basic ")) {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      const candidateUser = decoded.slice(0, separator);
      const candidatePass = decoded.slice(separator + 1);

      if (safeEqual(candidateUser, user) && safeEqual(candidatePass, password)) {
        next();
        return;
      }
    }

    res.set("WWW-Authenticate", `Basic realm="${realm}"`);
    res.status(401).send("Authentication required");
  };
};
