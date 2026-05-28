# Frontend Design Spec

Reference when building any UI page. Pages are built one by one. See `ARCHITECTURE.md` for implementation details.

---

## Design Language

- **Minimal, low-contrast.** Tokens: `border-border`, `bg-card`, `bg-muted`.
- **Compact/dense.** `text-xs` / `text-sm` throughout.
- **Rounded corners everywhere.** `rounded-xl`, `rounded-2xl`.
- **Dark/light via CSS variables + next-themes.**
- **Accent used sparingly** — CTAs and active links only.

---

## Public Pages

### Home (`/`) — Done

- Fixed top navbar: bot handle on left; theme toggle + "Chat with me" button on right. Frosted glass (`backdrop-blur`).
- Centered hero: circular avatar placeholder, large handwritten-style headline ("Hi, I'm [Name]. Ask me anything."), short bio blurb, landing chat input below.
- Landing chat input: single-line input + send button; FAQ shortcut chips as rounded pill buttons below.
- Footer: handle + social links.

### Chat (`/chat`) — Done

- Two-column: fixed 240px left sidebar + main chat area.
- **Sidebar:** handle link, "New chat" button, scrollable past-conversation list (chat icon + truncated title), footer attribution. Mobile: collapses into slide-out Sheet via hamburger.
- **Empty state:** centered "What do you want to know?" + 2-col grid of suggested prompt cards.
- **Messages:** user = right-aligned dark bubble ("You" avatar); bot = left-aligned light card bubble ("AI" avatar). Bot renders full Markdown (headings, lists, tables, inline code, syntax-highlighted code blocks w/ copy button).
- **Typing indicator:** three bouncing dots in bot bubble.
- **Input bar:** rounded card at bottom, auto-resizing textarea, mic icon button, send button (dark fill only when text is present).

---

## Admin Pages (`/admin/*`)

### Login (`/admin/login`) — Done

Centered card, gear icon, "Admin Access" heading, Google OAuth sign-in button, "Authorized Personnel Only" label below.

### Dashboard (`/admin`) — Partial (shell built, data static)

- **Header:** title + "Add knowledge" & "Re-train" outline buttons.
- **4-col stat cards:** Conversations, Avg length, KB sources, Last re-index.
- **Two-col section:** left "Popular questions (7d)" list with counts; right "Quick actions" links + "Improvements" bullets.

### Knowledge Base (`/admin/knowledge`) — Not built

- Header with source count + "Add knowledge" button.
- Full-width table: Name (icon), Type, Chunks, Status (colored badge: green/yellow/blue), Updated, actions (refresh + delete icon buttons).

### Chat Logs (`/admin/chat-logs`) — Not built

- Header with session count + search input.
- Expandable table rows: Date, First message, Message count, Duration, Rating badge (positive / neutral / negative).
- Row expands inline to show first exchange preview in chat-bubble style.

### AI Personality (`/admin/personality`) — Not built

- Two-column layout.
- **Left form:** bot name input, tone dropdown, system prompt textarea, refuse-topics textarea, FAQ chips manager (add/remove chips).
- **Right:** "Live preview" placeholder (Coming Soon card).
- Save button → green "Saved!" confirmation on success.

### Settings (`/admin/settings`) — Not built

- Single-column form, sections separated by horizontal rules:
  - **Profile:** display name input + handle input (with @ prefix).
  - **API Keys:** password-style input (hidden by default).
  - **Danger Zone:** destructive "Clear all knowledge" button with confirmation.
- Save button cycles: idle → loading spinner → green check → error state.

---

## Admin Layout (applies to all `/admin/*` except login/error)

- Fixed 224px left sidebar + scrollable main content area.
- **Sidebar:** "Admin" logo + theme toggle, accent "Add knowledge" CTA, nav items (Dashboard, Knowledge Base, Chat Logs, AI Personality, Settings), footer with "Back to site" + "Sign out".
- Active nav item gets accent color highlight.
