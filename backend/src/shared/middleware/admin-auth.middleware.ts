import { hkdf } from "@panva/hkdf";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { jwtDecrypt } from "jose";

import { UnauthorizedError } from "../utils/app-error";
import { env } from "@/config";

async function getDerivedEncryptionKey(secret: string): Promise<Uint8Array> {
  return hkdf("sha256", secret, "", "NextAuth.js Generated Encryption Key", 32);
}

async function decodeNextAuthToken(
  token: string,
  secret: string
): Promise<{ email?: string }> {
  const derivedKey = await getDerivedEncryptionKey(secret);
  const { payload } = await jwtDecrypt(token, derivedKey, {
    clockTolerance: 15,
  });
  return payload as { email?: string };
}

export const requireAdmin: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const nextauthSecret = env.NEXTAUTH_SECRET;
    const adminEmail = env.ADMIN_EMAIL;

    if (!nextauthSecret || !adminEmail) {
      throw new UnauthorizedError("Admin auth not configured");
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing admin token");
    }

    const token = authHeader.slice(7);
    const payload = await decodeNextAuthToken(token, nextauthSecret);

    if (
      !payload.email ||
      payload.email.toLowerCase() !== adminEmail.toLowerCase()
    ) {
      throw new UnauthorizedError("Forbidden");
    }

    req.adminEmail = payload.email;
    next();
  } catch (error) {
    next(error);
  }
};
