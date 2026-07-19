import { defineConfig } from "vitest/config"
import { resolve } from "path"

// Scoped to the v3 API's pure logic — no DB, no server. See
// docs/superpowers/specs/2026-07-19-v3-public-api-design.md.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
    // lib/security/auth.ts throws at import time without this, and the key model
    // reuses its hasher.
    env: { JWT_SECRET: "test-secret-not-used-for-signing" },
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
})
