import { SignJWT, jwtVerify } from "jose";
import { env } from "@/config";

const secret = () => new TextEncoder().encode(env.NEXTAUTH_SECRET);

export async function signSseToken(documentId: string): Promise<string> {
  return new SignJWT({ documentId, purpose: "sse" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(secret());
}

export async function verifySseToken(token: string): Promise<{ documentId: string }> {
  const { payload } = await jwtVerify(token, secret());

  if (payload["purpose"] !== "sse" || typeof payload["documentId"] !== "string") {
    throw new Error("Invalid SSE token");
  }

  return { documentId: payload["documentId"] };
}
