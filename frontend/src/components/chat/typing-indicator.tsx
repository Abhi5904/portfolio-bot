import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/** Three bouncing dots in a bot-style bubble, shown while a reply is pending. */
export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback className="bg-muted text-[10px] font-medium">AI</AvatarFallback>
      </Avatar>
      <div className="flex items-center rounded-2xl border border-border bg-card px-3.5 py-3">
        <div className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
