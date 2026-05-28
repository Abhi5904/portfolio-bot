import type { Metadata } from "next";

import { ChatShell } from "@/components/chat/chat-shell";

export const metadata: Metadata = {
  title: "Chat",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>;
}) {
  const { q, id } = await searchParams;
  return (
    <ChatShell
      initialQuery={typeof q === "string" ? q : undefined}
      initialConversationId={typeof id === "string" ? id : undefined}
    />
  );
}
