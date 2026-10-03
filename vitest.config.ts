import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone config: the app's vite.config.ts loads TanStack Start and nitro,
// which unit tests don't need.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { TZ: "UTC" },
  },
});
