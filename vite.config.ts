import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig(({ command }) => ({
  server: { port: 8080 },
  resolve: {
    alias: { "@": src },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // src/server.ts wraps the SSR handler with the error page.
      server: { entry: "server" },
      // Node-only code under src/server must never reach the browser bundle.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    // Cloud Run runs the Node server output: `node .output/server/index.mjs`.
    ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
    viteReact(),
  ],
}));
