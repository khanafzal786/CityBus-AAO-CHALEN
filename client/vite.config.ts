import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: "../public",
  plugins: [react()],
  build: { outDir: "../standalone-dist", emptyOutDir: true },
  server: { port: 5173, proxy: { "/api": "http://localhost:3001" } },
});
