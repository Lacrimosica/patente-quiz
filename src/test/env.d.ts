import type { D1Migration } from "@cloudflare/vitest-pool-workers";

// Bindings available to tests via `import { env } from "cloudflare:test"`.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
