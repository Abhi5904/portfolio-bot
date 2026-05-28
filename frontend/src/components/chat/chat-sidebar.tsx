import Link from "next/link";
import { MessageSquare, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import type { Conversation } from "@/types/chat";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onNewChat: () => void;
  onSelect?: (id: string) => void;
  className?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * Conversation rail. Rendered both as the fixed desktop column and inside the
 * mobile slide-out sheet, so it owns no layout width of its own beyond w-full.
 */
export function ChatSidebar({
  conversations,
  activeId,
  onNewChat,
  onSelect,
  className,
  searchQuery = "",
  onSearchChange,
}: ChatSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="p-3">
        <Link
          href="/"
          className="px-2 text-sm font-medium tracking-tight transition-colors hover:text-sidebar-foreground/70"
        >
          {siteConfig.handle}
        </Link>
      </div>

      <div className="px-3 pb-2 flex flex-col gap-2">
        <Button variant="outline" className="w-full justify-start shrink-0" onClick={onNewChat}>
          <Plus />
          New chat
        </Button>
        <div className="relative flex items-center shrink-0">
          <Search className="absolute left-2.5 size-3.5 text-sidebar-foreground/50 pointer-events-none" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-sidebar-accent/30 border-sidebar-border focus-visible:ring-1 focus-visible:ring-sidebar-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 px-3 py-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect?.(conversation.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                conversation.id === activeId &&
                  "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{conversation.title}</span>
            </button>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        Powered by {siteConfig.handle}
      </div>
    </aside>
  );
}
