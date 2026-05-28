import { prisma } from "@/config";
import type { ConversationsListQueryDTO } from "./conversations.type";

export class ConversationsService {
  async list(query: ConversationsListQueryDTO, sessionId: string) {
    const { search } = query;
    return prisma.conversation.findMany({
      where: {
        sessionId,
        ...(search && { title: { contains: search, mode: "insensitive" } }),
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }
}
