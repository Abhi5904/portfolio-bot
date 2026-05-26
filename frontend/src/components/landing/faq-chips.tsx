interface FaqChipsProps {
  items: readonly string[];
  onSelect: (value: string) => void;
}

/** Rounded pill shortcuts that prefill a question and jump into the chat. */
export function FaqChips({ items, onSelect }: FaqChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
