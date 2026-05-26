"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatComposer } from "@/components/chat/chat-composer";
import { MessageList } from "@/components/chat/message-list";
import { useChat } from "@/hooks/use-chat";
import { mockConversations } from "@/lib/mock-data";
import { siteConfig } from "@/config/site";

interface ChatShellProps {
  /** Optional question handed off from the landing page; sent once on mount. */
  initialQuery?: string;
}

/**
 * Top-level client container for the chat route. Wires the chat state to the
 * sidebar, message list and composer, and handles the responsive layout
 * (fixed rail on desktop, slide-out sheet on mobile).
 */
export function ChatShell({ initialQuery }: ChatShellProps) {
  const { messages, isLoading, sendMessage, reset } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const initialSent = useRef(false);

  useEffect(() => {
    if (initialQuery && !initialSent.current) {
      initialSent.current = true;
      void sendMessage(initialQuery);
    }
  }, [initialQuery, sendMessage]);

  function handleNewChat() {
    reset();
    setMenuOpen(false);
  }

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Desktop rail */}
      <div className="hidden w-60 shrink-0 border-r border-border md:block">
        <ChatSidebar conversations={mockConversations} onNewChat={handleNewChat} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar + slide-out sidebar */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
            <SheetTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Open menu" />}
            >
              <Menu />
            </SheetTrigger>
            <span className="text-sm font-medium tracking-tight">{siteConfig.handle}</span>
          </header>
          <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Conversations</SheetTitle>
            <ChatSidebar conversations={mockConversations} onNewChat={handleNewChat} />
          </SheetContent>
        </Sheet>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <ChatEmptyState onSelect={sendMessage} />
          ) : (
            <div className="mx-auto w-full max-w-3xl px-4 py-6">
              <MessageList messages={messages} isLoading={isLoading} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border px-4 py-3">
          <div className="mx-auto w-full max-w-3xl">
            <ChatComposer onSend={sendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
