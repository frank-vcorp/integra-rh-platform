import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["client/src/**/*.test.{ts,tsx}", "client/src/**/*.spec.{ts,tsx}"],
    setupFiles: [path.resolve(import.meta.dirname, "vitest.setup.ts")],
    css: true,
  },
});
