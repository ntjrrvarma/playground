import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { passWithNoTests: true, environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});

