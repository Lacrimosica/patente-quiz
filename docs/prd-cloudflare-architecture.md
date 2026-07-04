# PRD: Cloudflare Workers + D1 Architecture Foundation

## Problem Statement

The project was started with Node.js scripts that write directly to a local SQLite file via `node:sqlite`. The planned server was Express. This stack is incompatible with the firm goal of running on Cloudflare Workers: Workers have no filesystem, no `node:sqlite`, and no long-running process to hold a connection open. Building the Express server now would mean rewriting it entirely before deployment, and any DB access pattern designed around a sync `DatabaseSync` connection would have to be replaced with D1's async API.

The project is early enough that the architectural pivot costs almost nothing — but only if done before the server is built.

## Solution

Replace the local SQLite/Express stack with a Cloudflare Workers + D1 foundation before the first route is written. The import pipeline stays as a local Node.js script (filesystem access is required) but targets D1 instead of a raw SQLite file. The server becomes a Workers fetch handler. All DB access goes through a typed query module that accepts a `D1Database` binding injected by the Worker runtime.

## User Stories

1. As a developer, I want to run `wrangler dev` and have the full app available locally, so that local development is identical to production behavior.
2. As a developer, I want to run a single import command that reads raw chapter JSON and loads it into the local D1 database, so that I don't have to manually write SQL to add questions.
3. As a developer, I want the import to be idempotent, so that I can re-run it safely after correcting a transcription error without losing review state.
4. As a developer, I want schema changes to be tracked as numbered migration files, so that I have a full audit trail and can apply them consistently to both local and remote D1.
5. As a developer, I want to deploy the app to Cloudflare Workers with `wrangler deploy`, so that the app is accessible from anywhere without managing infrastructure.
6. As a developer, I want all DB queries to be typed, so that TypeScript catches shape mismatches between the DB schema and the application code at compile time.
7. As a developer, I want the Worker to serve the REST API and the static frontend from the same origin, so that there are no CORS issues in production.
8. As a developer, I want the import pipeline to handle multiple chapter files in a single run, so that adding a new chapter is just adding a JSON file and re-running the import command.
9. As a developer, I want foreign key constraints to be enforced by the database, so that orphaned review_state rows are impossible.
10. As a developer, I want the seed SQL to use `INSERT OR REPLACE` so that re-importing a corrected chapter updates the question without touching its review state row.
11. As a developer, I want the import SQL to wrap each chapter in a deferred-FK transaction, so that the insert order of questions and review_state rows does not cause FK constraint failures mid-transaction.
12. As a developer, I want the embeddings concern to live in Vectorize rather than D1, so that the D1 schema stays relational and vector similarity search uses the right tool.
13. As a developer, I want the phase-2 tables (documents, explanations) reserved in the initial migration, so that the eventual RAG feature does not require a migration that touches the questions table.

## Implementation Decisions

### Stack

- **Runtime**: Cloudflare Workers (fetch handler, not Express)
- **Database**: Cloudflare D1 (managed SQLite, async API, FK enforcement on by default)
- **Schema management**: Wrangler D1 migrations (numbered SQL files, applied via `wrangler d1 migrations apply`)
- **Import pipeline**: Node.js script generates a `.sql` seed file; `wrangler d1 execute` applies it
- **Vector storage**: Cloudflare Vectorize (phase 2 only, not in this PRD)
- **Frontend**: Vite + React, served from the same Worker via static asset binding (or Pages, TBD)

### D1 Foreign Key Behaviour

D1 enforces foreign keys by default — equivalent to `PRAGMA foreign_keys = ON` on every transaction. This cannot be disabled per-query. Seed SQL files must open with `PRAGMA defer_foreign_keys = ON` inside a `BEGIN`/`COMMIT` block to allow questions and review_state rows to be inserted in a single transaction without ordering issues.

### Schema

Four tables in D1:

- **questions** — transcribed Q&A content, re-importable. Primary key is a stable derived ID (`ch{N}-{NNN}`).
- **review_state** — live app state per question (doubt flag, confidence, review counts). Separate from questions so re-import never clobbers user progress.
- **documents** — reserved for phase 2 RAG text chunks. Not used by the app yet.
- **explanations** — reserved for phase 2 LLM-generated explanations. Not used by the app yet.

The `embeddings` table is removed from D1 entirely. Vector data belongs in Vectorize.

Indexes: `idx_questions_chapter`, `idx_questions_topic`, `idx_review_doubt` — created in the initial migration alongside the tables.

### Import Pipeline

The import script remains a local Node.js process (needs filesystem access to `data/raw/`). It:

1. Reads all `data/raw/chapter-N.json` files
2. Generates `data/seed.sql` — a single SQL file with `PRAGMA defer_foreign_keys = ON`, a `BEGIN`/`COMMIT` block, and `INSERT OR REPLACE` statements for questions + `INSERT OR IGNORE` for review_state rows
3. Shells out (or documents running) `wrangler d1 execute DB --local --file=data/seed.sql`

`data/seed.sql` is gitignored (generated artifact).

The `init-db.ts` script is deleted — schema creation is now owned by Wrangler migrations.

### DB Module (the seam)

A typed query module (`src/db/`) exposes pure async functions that accept a `D1Database` binding and return typed domain objects. No SQL lives outside this module.

The interface surface is intentionally small:
- `listQuestions(db, filters)` — chapter, topic, doubtOnly filters; joins review_state; orders by least-recently-reviewed
- `getQuestion(db, id)` — single question with its review state
- `upsertReviewState(db, questionId, patch)` — partial update of review state fields
- `recordReview(db, questionId, correct)` — increments times_reviewed, times_correct, sets last_reviewed_at

Routes call these functions and never write SQL directly.

### Worker Entry Point

`src/server/index.ts` exports a Workers fetch handler:

```ts
export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> { ... }
}
```

The `Env` type is the single point where the D1 binding is typed. The query module functions accept `env.DB` directly.

### TypeScript

The server and DB module use `@cloudflare/workers-types` (not `@types/node`). A `src/server/tsconfig.json` sets `"types": ["@cloudflare/workers-types"]` and covers `src/server/` and `src/db/`. Scripts continue to use the base tsconfig with `@types/node`.

## Testing Decisions

The primary seam is `D1Database`. Tests pass a real local D1 instance (via `wrangler dev` or Miniflare's in-process D1) rather than mocking SQL. The query module functions are the test surface — callers exercise them through their public interface, never by inspecting SQL or implementation internals.

Good tests look like: "insert a question and a review_state row into a local D1, call `listQuestions` with `doubtOnly: true`, assert only the flagged question is returned."

No unit tests for the import script's SQL generation — the idempotency guarantee is verified by running the import twice and asserting the row count doesn't change.

## Out of Scope

- Frontend routes and UI (separate PRD)
- Quiz session logic (separate PRD)
- Phase 2: Vectorize, Workers AI, RAG explanation generation
- ~~Auth (the app is local-first; auth is a deliberate non-goal for now)~~ — **superseded by ADR 0001**: username/password auth and per-user answer tracking were added in migration 0002.
- Hosting / custom domain setup
- CI/CD pipeline

## Further Notes

- `data/seed.sql` should be gitignored — it is a generated artifact, not source of truth. `data/raw/*.json` files are the source of truth for question content.
- The `wrangler d1 create patente-quiz` command must be run once to provision the remote D1 database and obtain a `database_id` for `wrangler.toml`.
- `data/db/patente.db` (the old local SQLite file) is obsolete once Wrangler D1 local emulation is in use. It should remain gitignored but can be deleted.
- The `defer_foreign_keys` pragma defers FK checks to the end of the transaction but does **not** disable `ON DELETE CASCADE` — cascades fire immediately. This is consistent with SQLite behaviour and is not a concern for the seed data (no cascades are defined).
