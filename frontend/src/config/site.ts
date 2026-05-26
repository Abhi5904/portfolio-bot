/**
 * Single source of truth for public-facing copy and links.
 * Anything the marketing/landing surface needs lives here so pages stay
 * declarative and content edits don't require touching components.
 */

export type SocialIcon = "github" | "twitter" | "linkedin" | "mail";

export interface SocialLink {
  label: string;
  href: string;
  icon: SocialIcon;
}

export interface SuggestedPrompt {
  title: string;
  subtitle: string;
}

export const siteConfig = {
  /** Display name used in the hero headline. */
  name: "Abhishek",
  /** Public handle shown in the navbar, sidebar and footer. */
  handle: "@abhishek",
  /** Short role/tagline. */
  role: "Full-stack developer & builder",
  /** Hero bio blurb. */
  bio: "I built this bot so you don't have to read my whole résumé. Ask about my work, projects, the stack I reach for, or how to get in touch.",
  /** Canonical site URL (used for metadata). */
  url: "https://abhishek.dev",

  socials: [
    { label: "GitHub", href: "https://github.com", icon: "github" },
    { label: "Twitter", href: "https://twitter.com", icon: "twitter" },
    { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
    { label: "Email", href: "mailto:hello@abhishek.dev", icon: "mail" },
  ] satisfies SocialLink[],

  /** FAQ shortcut chips shown under the landing input. */
  faqs: [
    "What do you do?",
    "Show me your best projects",
    "What's your tech stack?",
    "How can I reach you?",
  ],

  /** Prompt cards shown in the chat empty state. */
  suggestedPrompts: [
    {
      title: "Walk me through your experience",
      subtitle: "Roles, timelines, and what you actually shipped",
    },
    {
      title: "What are you most proud of?",
      subtitle: "A project worth talking about",
    },
    {
      title: "What's your tech stack?",
      subtitle: "Languages, frameworks, and tools you favor",
    },
    {
      title: "Are you open to work?",
      subtitle: "Availability and how to start a conversation",
    },
  ] satisfies SuggestedPrompt[],
} as const;

export type SiteConfig = typeof siteConfig;
