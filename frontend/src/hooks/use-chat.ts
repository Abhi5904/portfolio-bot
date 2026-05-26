"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { sendChatMessage } from "@/lib/chat-service";
import { createId } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

export interface UseChatResult {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  reset: () => void;
}

/**
 * Owns the live conversation state for a single chat session: the message
 * list, the in-flight loading flag, and the send/reset actions. The transport
 * is delegated to `chat-service`, so this hook stays backend-agnostic.
 */
export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mirror of `messages` so the async send can read the latest history
  // without adding it to the callback's dependency list.
  const historyRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    historyRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(historyRef.current, text);
      setMessages((prev) => [
        ...prev,
        { id: createId(), role: "assistant", content: reply, createdAt: Date.now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: "Something went wrong reaching the server. Please try again.",
          createdAt: Date.now(),
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const reset = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, reset };
}
