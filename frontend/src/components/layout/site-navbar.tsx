import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { siteConfig } from "@/config/site";

/**
 * Fixed, frosted-glass top navigation for the public marketing surface.
 */
export function SiteNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-sm font-medium tracking-tight transition-colors hover:text-foreground/70"
        >
          {siteConfig.handle}
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button size="sm" render={<Link href="/chat" />}>
            <MessageCircle />
            Chat with me
          </Button>
        </div>
      </nav>
    </header>
  );
}
