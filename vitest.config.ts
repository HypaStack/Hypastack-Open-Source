import { defineConfig } from "vitest/config"
import { resolve } from "path"

// Scoped to the v3 API's pure logic — no DB, no server. See
// docs/superpowers/specs/2026-07-19-v3-public-api-design.md.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
})
