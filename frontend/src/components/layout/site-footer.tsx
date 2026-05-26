import { Mail } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { GithubIcon, LinkedinIcon, XIcon } from "@/components/common/brand-icons";
import { siteConfig, type SocialIcon } from "@/config/site";

const ICONS: Record<SocialIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  github: GithubIcon,
  twitter: XIcon,
  linkedin: LinkedinIcon,
  mail: Mail,
};

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
        <span>
          {siteConfig.handle} · built with a little help from a bot
        </span>
        <div className="flex items-center gap-1">
          {siteConfig.socials.map((social) => {
            const Icon = ICONS[social.icon];
            return (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={social.label}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
