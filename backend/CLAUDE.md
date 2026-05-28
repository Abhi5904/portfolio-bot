# Backend CLAUDE.md

Read [ARCHITECTURE.md](./ARCHITECTURE.md) before making any change. The rules below are derived from it and are non-negotiable.

---

## Folder & Module Structure

- **Never** create files outside the documented structure (`src/modules/`, `src/shared/`, `src/ai/`, `src/queues/`, `src/config/`).
- Every new feature **must** live in its own folder under `src/modules/` and follow the exact 6-file pattern:
  ```
  x.routes.ts | x.controller.ts | x.service.ts | x.validation.ts | x.type.ts | index.ts
  ```
- If the module also has background queue work, add exactly 2 more files:
  ```
  x.jobs.ts    ← typed enqueue functions + job payload types + JOB_NAMES (stays in module)
  x.worker.ts  ← processor logic + export register(): Worker
  ```
- Wire new modules in `container.ts` (DI) and `routes.ts` (route registry). Nowhere else.
- The `src/ai/` layer owns no routes. If AI code needs module data, declare a port interface inside `ai/` and inject it via the container — never import a module service directly into `ai/`.
- `src/ai/` has three sub-areas — do not create files outside them:
  - `providers/` — LLM chat adapters (e.g. `ollama.provider.ts`)
  - `pipeline/` — RAG ingestion functions: `document-loader.ts`, `chunker.ts`, `embedder.ts`, `vector-store.ts`
  - `utils/` — shared helpers (e.g. `message-mapper.ts`)
- All RAG pipeline responsibilities (fetching from Cloudinary, parsing, chunking, embedding, vector storage) live in `src/ai/pipeline/` as plain exported async functions. Workers import from `@/ai` and call these functions — they never re-implement pipeline logic inline.

---

## Layering Rules

Controllers are thin — they only:
1. Read `req.validated` (never `req.body` directly).
2. Call one service method.
3. Return `successResponse(res, data)`.

All business logic, Prisma queries, and AI calls belong in the **service layer**, not in controllers or routes.

Middleware (`requireSession`, `requireAdmin`, `validate(schema)`) must be applied at the **route level**, not inside controllers or services.

---

## Performance & Query Rules

### No N+1 queries
- Never call Prisma inside a loop. Use `include`, `select`, or a single `findMany` with `where: { id: { in: ids } }`.
- If building a lookup map from a list, do it in **one pass** using `reduce` or `Map` after a single query.

### No repeated work
- Never re-derive a value that was already computed earlier in the same request. Pass it down as a parameter.
- Never call the same Prisma query (or Redis get) more than once per request. Fetch once, reuse.

### O(n²) is banned
- No nested loops over the same collection (`for` inside `for`, `map` inside `map` over the same data set).
- Sorting/deduplicating arrays of IDs before passing to Prisma `in` clauses is fine and encouraged.

### Prefer set / map lookups over linear scans
- When you need to check membership or key-based access on a list with more than a handful of items, convert to a `Set` or `Map` first, then look up in O(1).

---

## Shared Utilities — Use Them, Don't Duplicate

| Need | Use |
|---|---|
| Async controller wrapper | `asyncHandler` from `@/shared` |
| Error throwing | `AppError` subclasses (`NotFoundError`, `UnauthorizedError`, etc.) from `@/shared` |
| Zod validation schemas | Extend `BaseValidator`; expose `paginationQuery()` for list endpoints |
| Standardised responses | `successResponse(res, data)` from `@/shared` |
| Logging | `logger` from `@/shared` — never use `console.log` |
| Env vars | Import from `@/config` — never read `process.env` directly outside `config/env.ts` |

If something similar already exists in `@/shared`, extend or reuse it. Do **not** write a parallel utility.

---

## Validation

- Every route that accepts input must have a `validate(schema)` middleware using a schema from the module's `x.validation.ts`.
- Schemas must use `z.object({ body?, query?, params? })` via `BaseValidator`.
- Type-narrow with `req.validated` — never cast `req.body as SomeType`.

---

## Auth

- Visitor routes: add `requireSession` in the route array; downstream code reads `req.sessionId`.
- Admin routes: add to `PRIVATE_ROUTES` in `routes.ts` with `middleware: [requireAdmin]`; downstream code reads `req.adminEmail`.
- Never re-implement auth logic inline — extend the existing middleware files only.

---

## Error Handling

- Throw typed `AppError` subclasses, never plain `new Error()` in service/controller code.
- Let `errorMiddleware` handle HTTP status mapping — don't set `res.status` in controllers for error paths.
- `asyncHandler` catches all promise rejections; do not add redundant try/catch around a single awaited call.

---

## Queues

### Adding a new queue (5 steps, in order)

1. Add the name to `QUEUE_NAMES` in `queues/queue.constants.ts`.
2. Add the `Queue` instance in `queues/index.ts`.
3. Create `modules/x/x.jobs.ts`:
   - Define `JOB_NAMES` (local const, not exported from `queue.constants`).
   - Define `JOB_OPTIONS: JobsOptions` (attempts, backoff, removeOnComplete, removeOnFail).
   - Define the job payload type (e.g. `XJobData`).
   - Export a typed enqueue function: `export async function enqueueX(args): Promise<void>` — pass `JOB_OPTIONS` as the third arg to `.add()`.
4. Create `modules/x/x.worker.ts`:
   - Write the processor logic as a private `async function process(job)`.
   - Define `WORKER_OPTIONS: Omit<WorkerOptions, "connection">` (concurrency, limiter, etc.).
   - Import `registerWorker` and `QUEUE_NAMES` from `@/queues`.
   - Export `export function register(): Worker` that calls `registerWorker(QUEUE_NAMES.X, process, WORKER_OPTIONS)`.
5. Import and call `register()` inside `queues/worker.ts`.

### Rules
- Services enqueue by calling the typed function from `x.jobs.ts` — never import `queues` or `JOB_NAMES` directly in a service.
- `JOB_NAMES` and payload types live **only** in the module's `x.jobs.ts`, not in `queue.constants.ts`.
- `registerWorker` lives in `queues/index.ts`; import it from `@/queues`.
- `queues/processors/` does **not** exist — processors belong in the module.
- Never enqueue from inside a Prisma transaction — finish the transaction first, then enqueue.

---

## Data Model

- `schema.prisma` is the single source of truth. Never write raw SQL that duplicates a Prisma model constraint.
- All new tables need: FK indexes, cascade deletes on FK relations, snake_case column names via `@map`.
- Never run migrations — the developer runs `npm run prisma:migrate` themselves after reviewing schema changes.

---

## TypeScript

- `@/*` resolves to `src/*`. Use this alias everywhere; no relative `../../` climbing past the module boundary.
- Run `npm run typecheck` before considering any task done. Zero type errors is a hard requirement.
- Do not use `any`. Infer types from Zod schemas with `z.infer<typeof schema>` and place them in `x.type.ts`.

---

## What NOT to Do

- Do not read `req.body` directly in controllers — always use `req.validated`.
- Do not use `console.log` — use `logger`.
- Do not add env var reads outside `config/env.ts`.
- Do not put business logic in route files.
- Do not create one-off utility functions that duplicate something already in `@/shared`.
- Do not write a new Prisma query inside a `.map()` or `.forEach()`.
- Do not skip `asyncHandler` on async controller methods.
