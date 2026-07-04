# ADR 0001: User authentication and per-user answer tracking

## Status

Accepted (2026-07-04)

## Context

The app began as a single-user, local-first study tool. `docs/prd-cloudflare-architecture.md`
explicitly listed auth as a non-goal, and `review_state` held one row per question with no user
dimension. The client tracked score only in React state, so a reload lost progress and nothing
recorded *who* answered *what*.

We now want to attribute every answer to a real account and keep a durable history of answers.

## Decision

1. **Real username + password auth with server-side sessions.** This reverses the PRD's
   "auth is a non-goal" stance for the current phase.
2. **Password hashing uses PBKDF2-SHA256 via the Web Crypto API** (`crypto.subtle`), ~100k
   iterations, 16-byte random salt, stored as `pbkdf2$<iters>$<saltB64>$<hashB64>`. Cloudflare
   Workers has no Node crypto and no bcrypt/argon2; PBKDF2 is the strongest primitive available
   natively in the runtime.
3. **Sessions are opaque random tokens.** The raw token lives only in an `HttpOnly; SameSite=Strict`
   cookie; the database stores its SHA-256 hash (`sessions.token_hash`). `Secure` is added when the
   request is served over https so http localhost dev is unaffected.
4. **Answer storage is dual:** an append-only `answers` log (one row per answer event) plus per-user
   `review_state` aggregates, upserted atomically via `db.batch()`.
5. **`review_state` becomes per-user** — composite primary key `(user_id, question_id)`. Migration
   0002 rebuilds the table; the old rows were seed placeholders with no real progress, so nothing is lost.
6. **Answers are persisted live** — the client POSTs `/api/answers` as each answer is given; the
   server computes correctness and is the source of truth.

## Consequences

- `GET /api/questions` now requires authentication (it needs the user id for the per-user join).
  `/api/topics` stays public (question content only).
- The importer no longer seeds `review_state`; those rows are created lazily on first answer.
- Out of scope for now: password reset, email, roles, and login rate limiting.
