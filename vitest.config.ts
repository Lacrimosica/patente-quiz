import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { defineConfig } from "vitest/config";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  // Read the same migrations wrangler applies, so tests run against the real schema.
  const migrations = await readD1Migrations(join(__dirname, "migrations"));

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          // Expose the migrations to the setup file via a binding.
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      setupFiles: ["./src/test/apply-migrations.ts"],
    },
  };
});
