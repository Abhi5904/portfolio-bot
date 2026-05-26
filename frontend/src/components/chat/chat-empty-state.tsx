import { siteConfig } from "@/config/site";

interface ChatEmptyStateProps {
  onSelect: (prompt: string) => void;
}

/** Shown before any messages: a heading plus a grid of suggested prompts. */
export function ChatEmptyState({ onSelect }: ChatEmptyStateProps) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 px-4">
      <h2 className="text-2xl font-medium tracking-tight">What do you want to know?</h2>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        {siteConfig.suggestedPrompts.map((prompt) => (
          <button
            key={prompt.title}
            type="button"
            onClick={() => onSelect(prompt.title)}
            className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-muted"
          >
            <p className="text-sm font-medium">{prompt.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{prompt.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
