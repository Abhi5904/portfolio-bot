import { apiFetch, apiFetchStream } from "@/lib/api-client";
import type { ChatMessage, Conversation } from "@/types/chat";

export interface BackendConversation {
  id: string;
  sessionId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMessage {
  id: string;
  content: string;
  role: "USER" | "ASSISTANT";
  createdAt: string;
}

export const chatService = {
  async listConversations(search?: string): Promise<Conversation[]> {
    const res = await apiFetch<{
      success: boolean;
      data: BackendConversation[];
    }>("/public/conversations", {
      params: { search },
    });
    if (!res.data) return [];
    return res.data.map((item) => ({
      id: item.id,
      title: item.title || "Untitled Chat",
      updatedAt: Date.parse(item.updatedAt),
    }));
  },

  async listMessages(conversationId: string, search?: string): Promise<ChatMessage[]> {
    const res = await apiFetch<{
      status: string;
      message: string;
      data: BackendMessage[];
    }>(`/public/messages/${conversationId}`, {
      params: { search },
    });

    if (!res.data) return [];

    return res.data.map((item) => ({
      id: item.id,
      role: item.role.toLowerCase() as "user" | "assistant",
      content: item.content,
      createdAt: Date.parse(item.createdAt),
    }));
  },

  async sendMessageStream(
    message: string,
    conversationId: string | undefined,
    onChunk: (data: {
      conversationId?: string;
      chunk?: string;
      done?: boolean;
      error?: string;
    }) => void,
  ): Promise<void> {
    await apiFetchStream(
      "/public/messages",
      { message, conversationId },
      onChunk,
    );
  },
};
