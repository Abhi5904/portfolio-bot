import { prisma } from "@/config";
import type {
  MessagesConversationIdParamsDTO,
  MessagesListQueryDTO,
  MessagesSendBodyDTO,
} from "./messages.type";
import type { Response } from "express";
import { BadRequestError } from "@/shared";
import { ollamaProvider, toLangChainMessage } from "@/ai";

export class MessagesService {
  async list(
    query: MessagesListQueryDTO,
    params: MessagesConversationIdParamsDTO
  ) {
    const { search } = query;
    const { conversationId } = params;

    return prisma.message.findMany({
      where: {
        conversationId,
        ...(search && { content: { contains: search, mode: "insensitive" } }),
      },
      select: {
        createdAt: true,
        id: true,
        content: true,
        role: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async send(body: MessagesSendBodyDTO, res: Response, sessionId: string) {
    const { message } = body;
    let conversationId = body.conversationId;

    if (conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, sessionId },
        select: { id: true },
      });
      if (!conversation) {
        throw new BadRequestError("No conversation found");
      }
    } else {
      const conversation = await prisma.conversation.create({
        data: { sessionId, title: message.slice(0, 60) },
        select: { id: true },
      });
      conversationId = conversation.id;
    }

    await prisma.message.create({
      data: { content: message, conversationId },
    });

    const history = await prisma.message.findMany({
      where: { conversationId },
      select: { content: true, role: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const aiMessages = history.map((m) =>
      toLangChainMessage({ role: m.role, content: m.content })
    );

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Tell the client the conversation id up front (it may be brand-new), so
    // it can update its URL/state before the tokens arrive.
    res.write(`data: ${JSON.stringify({ conversationId })}\n\n`);

    // Stream chunks to client and accumulate full response
    let fullResponse = "";

    try {
      for await (const chunk of ollamaProvider.stream(aiMessages)) {
        if (!chunk.done) {
          fullResponse += chunk.delta;
          res.write(`data: ${JSON.stringify({ chunk: chunk.delta })}\n\n`);
        }
      }

      // Save complete AI response to DB after stream finishes
      await prisma.message.create({
        data: { content: fullResponse, conversationId, role: "ASSISTANT" },
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    } finally {
      res.end();
    }
  }
}
