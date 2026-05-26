"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
// Syntax theme for highlighted code (applied via the `hljs` class).
import "highlight.js/styles/github-dark.css";

interface CodeBlockProps {
  language?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Fenced code block with a language label and a copy-to-clipboard button. */
export function CodeBlock({ language, className, children }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = codeRef.current?.textContent ?? "";
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between bg-[#0d1117] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-white/40">
          {language ?? "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        <code ref={codeRef} className={cn(className)}>
          {children}
        </code>
      </pre>
    </div>
  );
}
