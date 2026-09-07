import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // db.ts constructs a Prisma client (lazily connecting, not eagerly) at
    // module-eval time, which is enough to make DATABASE_URL required just to
    // *import* a module like profile-service.ts — even for tests that only
    // exercise its pure functions and never touch the database.
    env: { DATABASE_URL: "postgresql://test:test@localhost:5432/test" },
  },
});
