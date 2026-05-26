"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaqChips } from "@/components/landing/faq-chips";
import { siteConfig } from "@/config/site";

/**
 * Landing entry point: a single-line question box plus FAQ shortcuts. Both
 * hand the question off to `/chat` via a `q` search param, where it is sent
 * automatically.
 */
export function LandingChatInput() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm focus-within:border-foreground/20"
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Ask ${siteConfig.name} anything…`}
          aria-label="Ask a question"
          className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim()}
          aria-label="Send"
        >
          <ArrowUp />
        </Button>
      </form>

      <FaqChips items={siteConfig.faqs} onSelect={go} />
    </div>
  );
}
