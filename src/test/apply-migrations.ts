import { applyD1Migrations, env } from "cloudflare:test";

// Runs once per test worker before any test: brings the in-process D1 up to the
// current schema using the project's real migration files.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
