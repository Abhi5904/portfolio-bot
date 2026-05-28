# Frontend Architecture

Next.js 16 (App Router + Turbopack), React 19, TypeScript, Tailwind v4, `@/*` → `src/*`. shadcn/ui on Base UI (`@base-ui/react`), next-themes, NextAuth v4 (Google OAuth).

---

## Folder Structure

```
frontend/src/
├── app/                          # Routes + page composition only (no business logic)
│   ├── page.tsx                  # Landing page (/)
│   ├── layout.tsx                # Root layout — wraps AuthProvider, SessionProvider, ThemeProvider
│   ├── globals.css               # Tailwind v4 base + CSS variable tokens
│   ├── chat/
│   │   └── page.tsx              # Chat page (/chat) — reads ?q= searchParam, auto-sends on mount
│   ├── admin/
│   │   ├── page.tsx              # Admin dashboard (server component — getServerSession, redirects if unauth)
│   │   ├── login/page.tsx        # Google OAuth sign-in page
│   │   └── error/page.tsx        # Auth error page (shown on rejected email)
│   └── api/
│       └── auth/
│           ├── [...nextauth]/route.ts   # NextAuth handler; exports authOptions
│           └── token/route.ts           # GET /api/auth/token — returns raw NextAuth JWT for backend calls
├── components/
│   ├── ui/                       # shadcn primitives (design system, do not add business logic here)
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   └── textarea.tsx
│   ├── layout/                   # App-shell pieces
│   │   ├── site-navbar.tsx
│   │   └── site-footer.tsx
│   ├── common/                   # Shared widgets reused across pages
│   │   ├── brand-icons.tsx       # Inline SVG brand glyphs (GitHub, Twitter, LinkedIn) — lucide removed these
│   │   └── theme-toggle.tsx
│   ├── landing/                  # Components exclusive to the landing page
│   │   ├── hero.tsx
│   │   ├── landing-chat-input.tsx
│   │   └── faq-chips.tsx
│   ├── chat/                     # Components exclusive to the chat page
│   │   ├── chat-shell.tsx        # Top-level chat layout (sidebar + main area)
│   │   ├── chat-sidebar.tsx      # Conversation list + new chat; collapses to Sheet on mobile
│   │   ├── message-list.tsx      # Scrollable message thread
│   │   ├── message-bubble.tsx    # Single message — user (right) or assistant (left)
│   │   ├── markdown-content.tsx  # react-markdown + remark-gfm + rehype-highlight renderer
│   │   ├── code-block.tsx        # Syntax-highlighted block with copy button
│   │   ├── chat-composer.tsx     # Auto-resizing textarea + send/mic buttons
│   │   ├── chat-empty-state.tsx  # Suggested prompt cards shown before first message
│   │   └── typing-indicator.tsx  # Three bouncing dots
│   └── admin/
│       └── dashboard.tsx         # Admin dashboard UI (client component)
├── config/
│   └── site.ts                   # All public copy: bio, links, FAQs, suggested prompts
├── hooks/
│   └── use-chat.ts               # Chat state machine: messages, streaming, session, conversations
├── lib/
│   ├── api-client.ts             # apiFetch, apiFetchStream (visitor), adminApiFetch (admin → Bearer token)
│   ├── cookies.ts                # getCookie / setCookie / deleteCookie (visitor session)
│   ├── mock-data.ts              # Static mock conversations + messages for dev/demo
│   └── utils.ts                  # cn() (clsx + twMerge), createId()
├── providers/
│   ├── auth-provider.tsx         # NextAuth SessionProvider wrapper
│   ├── session-provider.tsx      # Visitor session bootstrap (creates + stores visitor_session_id cookie)
│   └── theme-provider.tsx        # next-themes ThemeProvider wrapper
├── services/
│   ├── chat-service.ts           # Chat API calls (send message, list messages, conversations)
│   └── session-service.ts        # POST /sessions to create visitor session
└── types/
    └── chat.ts                   # ChatRole, ChatMessage, Conversation
```

---

## Architecture: Layered / Type-Based (NOT feature-based)

Files are organized by technical role, not by feature. The user explicitly chose this over feature folders.

| Layer | Responsibility |
|---|---|
| `app/` | Route segments + page composition only |
| `components/ui/` | shadcn design system primitives |
| `components/layout/` | Site-wide shell (navbar, footer) |
| `components/common/` | Shared cross-page widgets |
| `components/landing/` | Landing page sections |
| `components/chat/` | Chat page pieces |
| `components/admin/` | Admin panel pieces |
| `hooks/` | Stateful logic (use-chat) |
| `services/` | API call functions |
| `lib/` | Pure utilities + API client |
| `providers/` | React context providers |
| `types/` | Shared TypeScript types |
| `config/` | Static content/copy |

---

## Auth Flow (Admin)

```
Browser                  Next.js (frontend)              Express (backend)
  │                            │                               │
  │── /admin/login ──────────► │                               │
  │                     Google OAuth via NextAuth              │
  │◄─ session cookie ──────────│ (httpOnly, encrypted JWT)     │
  │                            │                               │
  │── admin page load ────────►│                               │
  │                     getServerSession() checks email        │
  │                     redirects if not ADMIN_EMAIL           │
  │                            │                               │
  │── adminApiFetch() ────────►│ GET /api/auth/token           │
  │                     getToken({ raw:true })                  │
  │◄─ { token: "..." } ────────│ (raw encrypted JWT)          │
  │                            │                               │
  │──────── Authorization: Bearer <token> ───────────────────►│
  │                                                    requireAdmin middleware
  │                                                    HKDF derive key from NEXTAUTH_SECRET
  │                                                    jwtDecrypt → check email = ADMIN_EMAIL
  │◄──────────────────── 200 / 401 ────────────────────────────│
```

`authOptions` is exported from `[...nextauth]/route.ts` and imported by `/api/auth/token/route.ts` to share the same `secret`.

---

## Visitor Session Flow

```
Browser                          Next.js + Express
  │                                     │
  │── page load ────────────────────────►│
  │                              SessionProvider mounts
  │                              checks cookie visitor_session_id
  │                              if absent → POST /api/v1/public/sessions
  │◄── { sessionId } ───────────────────│
  │    stored in cookie                  │
  │                                     │
  │── chat message ─────────────────────►│
  │    x-session-id: <sessionId>         │
  │                              requireSession verifies DB
  │◄── SSE stream ───────────────────────│
```

---

## API Client (`lib/api-client.ts`)

| Function | Used by | Auth |
|---|---|---|
| `apiFetch<T>` | Visitor pages | `x-session-id` cookie header |
| `apiFetchStream` | Chat composer | `x-session-id` cookie header |
| `adminApiFetch<T>` | Admin pages | `Authorization: Bearer <nextauth-jwt>` |

`adminApiFetch` calls `/api/auth/token` internally to get the Bearer token before every request.

---

## Key Decisions & Gotchas

**shadcn style is `base-nova` built on Base UI (`@base-ui/react`), NOT Radix.**
Polymorphism uses the `render` prop (e.g. `<Button render={<Link href="..."/>}>`), not `asChild`.

**lucide-react removed all brand icons.**
GitHub, Twitter, LinkedIn glyphs are inline SVGs in `src/components/common/brand-icons.tsx` (Simple Icons paths). Standard icons like `Mail` still exist in lucide.

**Markdown rendering.**
`react-markdown` + `remark-gfm` + `rehype-highlight`. Code blocks use highlight.js `github-dark` theme with a copy button via `code-block.tsx`.

**Handwriting font.**
Caveat via `next/font`, exposed as `--font-handwriting` / `font-handwriting` Tailwind class.

**Dark mode.**
`next-themes` with `attribute="class"`. Tailwind v4 `@custom-variant dark` already configured by shadcn init.

**Landing input → chat routing.**
`landing-chat-input.tsx` and `faq-chips.tsx` push `?q=<text>` to `/chat`. `chat/page.tsx` reads the `q` searchParam and auto-sends once on mount via `use-chat`.

---

## Pages Built

| Route | Status | Notes |
|---|---|---|
| `/` | Done | Landing: navbar, hero, chat input, FAQ chips, footer |
| `/chat` | Done | Two-column: sidebar + message list + composer |
| `/admin` | Partial | Dashboard shell built; data is static (no live API calls yet) |
| `/admin/login` | Done | Google OAuth sign-in card |
| `/admin/error` | Done | Auth error page |
| `/admin/knowledge` | Not built | — |
| `/admin/chat-logs` | Not built | — |
| `/admin/personality` | Not built | — |
| `/admin/settings` | Not built | — |

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | Express base URL; default `http://localhost:8000/api/v1` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth app |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth app |
| `NEXTAUTH_SECRET` | Yes | Must match backend `NEXTAUTH_SECRET` exactly |
| `NEXTAUTH_URL` | Yes (prod) | Full URL of the Next.js app |
| `ADMIN_EMAIL` | Yes | Only this email can sign in |
