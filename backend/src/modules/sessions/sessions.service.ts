import { randomBytes } from "node:crypto";

import { prisma } from "@/config";

export class SessionsService {
  async create() {
    const session = await prisma.visitorSession.create({
      data: { sessionToken: randomBytes(32).toString("hex") },
      select: { id: true, createdAt: true },
    });

    return { sessionId: session.id, createdAt: session.createdAt };
  }
}
