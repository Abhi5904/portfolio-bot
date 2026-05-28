# Backend Architecture

Express 5 + TypeScript (ESM, `"type":"module"`, `@/*` → `src/*`). Prisma 7 (pg Pool adapter) + PostgreSQL, ioredis + BullMQ/bull-board, Zod v4, LangChain + Ollama. Build = `tsup`, dev = `tsx watch src/server.ts`.

---

## Folder Structure

```
backend/
├── prisma/
│   └── schema.prisma           # Single source of truth for data model
├── src/
│   ├── server.ts               # Entry: Server class — DB connect → Redis ping → listen → graceful shutdown
│   ├── app.ts                  # App class: express instance, middleware stack, route registration
│   ├── routes.ts               # Central route registry (PRIVATE_ROUTES / PUBLIC_ROUTES arrays)
│   ├── container.ts            # Manual DI: new Service() → new Controller(service) → new Routes(controller)
│   ├── config/
│   │   ├── env.ts              # Zod-validated env; process.exit(1) on bad vars
│   │   ├── db.ts               # databaseService Prisma singleton + exported `prisma`, has healthCheck()
│   │   ├── redis.ts            # redisConnection + baseOption + safeQuit
│   │   └── index.ts
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── admin-auth.middleware.ts   # requireAdmin — decrypts NextAuth JWT via HKDF + jose, checks ADMIN_EMAIL
│   │   │   ├── session.middleware.ts      # requireSession — reads x-session-id header, verifies VisitorSession in DB
│   │   │   ├── basic-auth.middleware.ts  # Hand-rolled timing-safe basic auth (used for Bull Board)
│   │   │   ├── validation.middleware.ts  # validate(schema) — Zod-based request validation
│   │   │   ├── error.middleware.ts       # errorMiddleware + notFoundMiddleware
│   │   │   ├── logger.middleware.ts      # requestLogger
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── app-error.ts      # AppError base + subclasses (UnauthorizedError, NotFoundError, etc.)
│   │   │   ├── async-handler.ts  # asyncHandler — wraps async controller methods
│   │   │   ├── base-validator.ts # BaseValidator — Zod schema builder with paginationQuery()
│   │   │   ├── response.ts       # successResponse helper
│   │   │   ├── logger.ts         # Leveled/timestamped logger; debug muted in prod
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── express.d.ts      # Augments Express Request: req.validated, req.sessionId?, req.adminEmail?
│   │   │   ├── validation.types.ts
│   │   │   └── index.ts
│   │   └── index.ts              # Barrel — import from @/shared
│   ├── modules/                  # One folder per feature (see Module Pattern below)
│   │   ├── conversations/
│   │   ├── messages/
│   │   ├── sessions/
│   │   └── knowledge-base/
│   ├── ai/                       # Top-level AI capability (NOT a module, owns no routes)
│   │   ├── ai.constants.ts       # MODELS, AI_DEFAULTS — single source of truth
│   │   ├── ai.types.ts           # TokenUsage, StreamChunk
│   │   ├── providers/
│   │   │   └── ollama.provider.ts  # OllamaProvider wrapping ChatOllama (WIP)
│   │   ├── utils/
│   │   │   └── message-mapper.ts  # toLangChainMessage(msg) — maps domain message → LangChain BaseMessage
│   │   └── index.ts
│   └── queues/                   # BullMQ infrastructure
│       ├── connection.ts         # bullConnection: separate IORedis (maxRetriesPerRequest: null)
│       ├── queue.constants.ts    # QUEUE_NAMES + JOB_NAMES as const; optional JobPayloads map
│       ├── index.ts              # queues registry + allQueues(), re-exports constants
│       ├── worker.ts             # One file, all workers via registerWorker(name, processor); own process + graceful shutdown
│       └── bull-board.ts         # mountBullBoard at BULL_BOARD_PATH; basic auth only when user+password set
```

---

## Request Lifecycle

```
Request
  → cors
  → express.json() / express.urlencoded()
  → requestLogger
  → routes (/, /health, Bull Board, /api/v1/*, /api/v1/public/*)
  → [route middleware: requireAdmin | requireSession]
  → validate(schema)
  → Controller.method (asyncHandler)
  → Service (Prisma / AI)
  → Response
  → errorMiddleware (catches AppError subclasses → correct HTTP status)
```

---

## Route Registration (`routes.ts`)

```
PRIVATE_ROUTES  → mounted at /api/v1{path}          (admin-only, use requireAdmin)
PUBLIC_ROUTES   → mounted at /api/v1/public{path}    (visitor-facing)
```

Current public routes:
| Path | Middleware | Purpose |
|---|---|---|
| `/sessions` | — | Create visitor sessions |
| `/conversations` | `requireSession` | List conversations for a session |
| `/messages` | `requireSession` | Send + list messages |

To add an admin route, add to `PRIVATE_ROUTES` with `middleware: [requireAdmin]` and register in `container.ts`.

---

## Per-Feature Module Pattern

Every module under `modules/` follows the same 6-file structure:

```
modules/x/
├── x.routes.ts       # Router class — wires validate(v.action) + controller method
├── x.controller.ts   # Thin; asyncHandler, reads req.validated, returns { success, data }
├── x.service.ts      # Business logic + Prisma queries
├── x.validation.ts   # extends BaseValidator; schemas keyed { body?, query?, params? }
├── x.type.ts         # DTOs via z.infer<typeof schema>
└── index.ts          # Barrel export
```

Then wire in `container.ts` (new Service → Controller → Routes) and `routes.ts` (add to PRIVATE or PUBLIC).

---

## Auth Middleware

### `requireSession` (visitor routes)
- Reads `x-session-id` header
- Looks up `VisitorSession` in DB; throws `UnauthorizedError` if missing/invalid
- Sets `req.sessionId` for downstream handlers

### `requireAdmin` (admin routes)
- Reads `Authorization: Bearer <token>` header
- Derives AES-256-GCM key from `NEXTAUTH_SECRET` using HKDF (`"NextAuth.js Generated Encryption Key"`)
- Decrypts token with `jwtDecrypt` from `jose`
- Verifies `payload.email === ADMIN_EMAIL` (case-insensitive)
- Sets `req.adminEmail`
- Token is the raw NextAuth v4 session JWT forwarded from the frontend via `/api/auth/token`

---

## AI Layer (`src/ai/`)

Consumed by module services and workers via `@/ai`. Owns no routes. Dependency rule: if AI code needs module data (e.g. RAG needs knowledge-base), declare a **port interface inside `ai/`**, have the module implement it, inject via container.

```
ai/
├── ai.constants.ts   ← MODELS, AI_DEFAULTS — single source of truth
├── ai.types.ts       ← StreamChunk
├── providers/        ← LLM chat adapters
│   └── ollama.provider.ts   OllamaProvider wrapping ChatOllama
├── pipeline/         ← RAG ingestion pipeline (5 stateless functions)
│   ├── document-loader.ts   fetchDocumentBlob(url) + parseDocumentBlob(blob, mimeType) → Document[]
│   ├── chunker.ts           chunkDocuments(docs, size, overlap) → Document[]
│   ├── embedder.ts          embedDocuments(docs) → number[][] (batched, uses MODELS.OLLAMA_EMBED)
│   ├── vector-store.ts      storeChunks(documentId, chunks, vectors) → pgvector INSERT
│   └── index.ts
├── utils/
│   └── message-mapper.ts    toLangChainMessage(msg)
└── index.ts          barrel — re-exports everything above
```

Stack: LangChain + Ollama (`langchain`, `@langchain/core`, `@langchain/ollama`, `@langchain/textsplitters`).

- `MODELS.OLLAMA` = `"qwen3:8b"`, `MODELS.OLLAMA_EMBED` = `"nomic-embed-text:latest"`
- `toLangChainMessage(msg)` maps `{role: MessageRole, content}` → LangChain `BaseMessage` (USER→HumanMessage, ASSISTANT→AIMessage)

### RAG Pipeline flow

```
knowledge-base.worker.ts (orchestrates steps + Redis pubsub)
  → fetchDocumentBlob(fileUrl)           FETCHING step — fetch bytes from Cloudinary
  → parseDocumentBlob(blob, mimeType)    PARSING  step — PDFLoader / DocxLoader / text
  → chunkDocuments(docs, size, overlap)  CHUNKING step — RecursiveCharacterTextSplitter
  → embedDocuments(chunks)               EMBEDDING step — OllamaEmbeddings batched
  → storeChunks(docId, chunks, vectors)  STORING  step — raw pgvector INSERT
```

Document loaders use LangChain's native loaders (`PDFLoader` via pdf-parse, `DocxLoader` via mammoth) with a `Blob` created from the fetched URL — no manual buffer/parser wiring.

Vector storage uses a raw `prisma.$executeRaw` INSERT because our `document_chunks` schema has extra project-specific columns (`document_id`, `chunk_index`) that LangChain's `PGVectorStore` generic table doesn't support.

---

## Data Model

```
VisitorSession 1─N Conversation 1─N Message
MessageRole { USER, ASSISTANT }
```

- Snake_case column names via `@map`
- Cascade deletes on all FK relations
- Indexes on all FK columns

---

## Queue Pattern

Adding a queue = 3 steps:
1. Add name to `QUEUE_NAMES` in `queue.constants.ts`
2. Add `Queue` instance in `queues/index.ts`
3. Add worker processor in `queues/worker.ts` via `registerWorker(name, processor)`

Dev: `npm run worker:dev` (tsx watch). Prod: `npm run worker` (built). tsup builds a second entry at `src/queues/worker.ts`.

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Full Prisma connection URL |
| `POSTGRES_HOST/PORT/USER/PASSWORD/DB` | Yes | For pg Pool / docker-compose |
| `REDIS_HOST` | Yes | |
| `REDIS_PORT` | No | Default 6379 |
| `REDIS_PASSWORD` | No | |
| `CORS_ORIGIN` | No | `"*"` or comma-separated list; default `"*"` |
| `CORS_CREDENTIALS` | No | `"true"` / `"false"`; default `false` |
| `BULL_BOARD_PATH` | No | Default `/admin/queues` |
| `BULL_BOARD_USER` | No | Set both user+password to enable basic auth |
| `BULL_BOARD_PASSWORD` | No | |
| `NEXTAUTH_SECRET` | Yes | Must match frontend `NEXTAUTH_SECRET` exactly |
| `ADMIN_EMAIL` | Yes | Email Zod-validated; must match NextAuth allowed email |

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run worker:dev` | `tsx watch src/queues/worker.ts` |
| `npm run build` | `tsup` |
| `npm run start` | `node dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run dev migrations |
| `npm run prisma:seed` | Seed DB |
