import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LandingChatInput } from "@/components/landing/landing-chat-input";
import { siteConfig } from "@/config/site";

export function Hero() {
  return (
    <section className="flex w-full flex-col items-center gap-6 text-center">
      <Avatar className="size-20 text-3xl">
        <AvatarFallback className="bg-muted">👤</AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-center gap-3">
        <h1 className="font-handwriting text-5xl leading-tight tracking-tight sm:text-6xl">
          Hi, I&apos;m {siteConfig.name}.
          <br />
          Ask me anything.
        </h1>
        <p className="max-w-md text-pretty text-sm text-muted-foreground">
          {siteConfig.bio}
        </p>
      </div>

      <LandingChatInput />
    </section>
  );
}
