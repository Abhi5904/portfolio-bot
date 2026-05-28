"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { chatService } from "@/services/chat-service";
import { createId } from "@/lib/utils";
import type { ChatMessage, Conversation } from "@/types/chat";
import { useSession } from "@/providers/session-provider";

export interface UseChatResult {
  messages: ChatMessage[];
  conversations: Conversation[];
  activeConversationId: string | undefined;
  isLoading: boolean;
  isLoadingConversations: boolean;
  sendMessage: (content: string) => Promise<void>;
  setActiveConversationId: (id: string | undefined) => void;
  reset: () => void;
  loadConversations: (search?: string) => Promise<void>;
  conversationsSearch: string;
  setConversationsSearch: (search: string) => void;
  messagesSearch: string;
  setMessagesSearch: (search: string) => void;
}

export function useChat(initialConversationId?: string): UseChatResult {
  const router = useRouter();
  const isSendingRef = useRef(false);
  const { sessionId, isLoading: isLoadingSession } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | undefined>(initialConversationId);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationsSearch, setConversationsSearch] = useState("");
  const [messagesSearch, setMessagesSearch] = useState("");

  const setActiveConversationId = useCallback((id: string | undefined) => {
    setActiveConversationIdState(id);
    if (id) {
      router.push(`/chat?id=${id}`);
    } else {
      router.push("/chat");
    }
  }, [router]);

  useEffect(() => {
    setActiveConversationIdState(initialConversationId);
  }, [initialConversationId]);

  // Load conversations list
  const loadConversations = useCallback(async (search?: string) => {
    if (!sessionId) return;
    setIsLoadingConversations(true);
    try {
      const list = await chatService.listConversations(search);
      setConversations(list);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [sessionId]);

  // Load conversations once session is ready or search query changes (debounced)
  useEffect(() => {
    if (!sessionId || isLoadingSession) return;
    const delayDebounce = setTimeout(() => {
      loadConversations(conversationsSearch);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [sessionId, isLoadingSession, conversationsSearch, loadConversations]);

  // Clear message search on switching conversations
  useEffect(() => {
    setMessagesSearch("");
  }, [activeConversationId]);

  // Load messages when active conversation changes or search query changes (debounced)
  useEffect(() => {
    if (isSendingRef.current) return;

    async function loadMessages() {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }
      setIsLoading(true);
      try {
        const history = await chatService.listMessages(activeConversationId, messagesSearch);
        setMessages(history);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setIsLoading(false);
      }
    }
    const delayDebounce = setTimeout(() => {
      loadMessages();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [activeConversationId, messagesSearch]);

  // Use refs to avoid dependency re-renders for callback
  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const sendMessage = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || isLoading || !sessionId) return;

    isSendingRef.current = true;
    const userMsgId = createId();
    const assistantMsgId = createId();

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let accumulatedReply = "";
    let conversationIdUpdated = false;
    let assistantMessageCreated = false;

    try {
      await chatService.sendMessageStream(
        text,
        activeConversationIdRef.current,
        (data) => {
          // If server reports the conversation ID, update the active ID
          if (data.conversationId && !conversationIdUpdated) {
            conversationIdUpdated = true;
            setActiveConversationId(data.conversationId);
            loadConversations();
          }

          if (data.chunk) {
            accumulatedReply += data.chunk;
            if (!assistantMessageCreated) {
              assistantMessageCreated = true;
              setMessages((prev) => [
                ...prev,
                { id: assistantMsgId, role: "assistant", content: accumulatedReply, createdAt: Date.now() },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedReply }
                    : msg
                )
              );
            }
          }

          if (data.error) {
            throw new Error(data.error);
          }
        }
      );
    } catch (err) {
      console.error("Streaming error:", err);
      if (!assistantMessageCreated) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            content: "Something went wrong reaching the server. Please try again.",
            createdAt: Date.now(),
            error: true,
          },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: accumulatedReply || "Something went wrong reaching the server. Please try again.",
                  error: true,
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  }, [isLoading, sessionId, loadConversations]);

  const reset = useCallback(() => {
    setActiveConversationId(undefined);
    setMessages([]);
    setIsLoading(false);
  }, [setActiveConversationId]);

  return {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    isLoadingConversations,
    sendMessage,
    setActiveConversationId,
    reset,
    loadConversations,
    conversationsSearch,
    setConversationsSearch,
    messagesSearch,
    setMessagesSearch,
  };
}
