"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatComposer } from "@/components/chat/chat-composer";
import { MessageList } from "@/components/chat/message-list";
import { useChat } from "@/hooks/use-chat";
import { useSession } from "@/providers/session-provider";
import { siteConfig } from "@/config/site";

interface ChatShellProps {
  /** Optional question handed off from the landing page; sent once on mount. */
  initialQuery?: string;
  initialConversationId?: string;
}

/**
 * Top-level client container for the chat route. Wires the chat state to the
 * sidebar, message list and composer, and handles the responsive layout
 * (fixed rail on desktop, slide-out sheet on mobile).
 */
export function ChatShell({ initialQuery, initialConversationId }: ChatShellProps) {
  const {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    isLoadingConversations,
    sendMessage,
    setActiveConversationId,
    reset,
    conversationsSearch,
    setConversationsSearch,
    messagesSearch,
    setMessagesSearch,
  } = useChat(initialConversationId);
  const { sessionId, isLoading: isLoadingSession } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const initialSent = useRef(false);

  useEffect(() => {
    if (initialQuery && !initialSent.current && sessionId && !isLoadingSession) {
      initialSent.current = true;
      void sendMessage(initialQuery);
    }
  }, [initialQuery, sendMessage, sessionId, isLoadingSession]);

  function handleNewChat() {
    reset();
    setMenuOpen(false);
  }

  function handleSelectConversation(id: string) {
    setActiveConversationId(id);
    setMenuOpen(false);
  }

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Desktop rail */}
      <div className="hidden w-60 shrink-0 border-r border-border md:block">
        <ChatSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onNewChat={handleNewChat}
          onSelect={handleSelectConversation}
          searchQuery={conversationsSearch}
          onSearchChange={setConversationsSearch}
        />
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
            <ChatSidebar
              conversations={conversations}
              activeId={activeConversationId}
              onNewChat={handleNewChat}
              onSelect={handleSelectConversation}
              searchQuery={conversationsSearch}
              onSearchChange={setConversationsSearch}
            />
          </SheetContent>
        </Sheet>

        {/* Active conversation sub-header (with message search) */}
        {activeConversationId && (
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/10 backdrop-blur-sm px-4">
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[50%]">
              {conversations.find((c) => c.id === activeConversationId)?.title || "Active Chat"}
            </span>
            <div className="relative flex items-center w-48 sm:w-64">
              <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search messages..."
                value={messagesSearch}
                onChange={(e) => setMessagesSearch(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs bg-muted/20 border-border focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Message area */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isEmpty ? (
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
