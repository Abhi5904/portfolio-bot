"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import type { ChatMessage } from "@/types/chat";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the latest message (or the typing indicator) in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const showTypingIndicator =
    isLoading &&
    (messages.length === 0 || messages[messages.length - 1]?.role !== "assistant");

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {showTypingIndicator && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
