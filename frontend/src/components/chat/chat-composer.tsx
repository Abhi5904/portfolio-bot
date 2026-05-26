"use client";

import { useState } from "react";
import { ArrowUp, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

/** Bottom input bar: auto-resizing textarea with mic and send affordances. */
export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !disabled;

  function submit() {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm transition-colors focus-within:border-foreground/20">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder="Ask a follow-up…"
        aria-label="Message"
        className="max-h-40 min-h-9 resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
      />
      <div className="flex items-center justify-between px-1">
        <Button variant="ghost" size="icon-sm" aria-label="Voice input" disabled>
          <Mic />
        </Button>
        <Button
          size="icon-sm"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
}
