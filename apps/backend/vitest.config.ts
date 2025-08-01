import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: ["node_modules"],
    testTimeout: 60000,
    slowTestThreshold: 30000,
    setupFiles: ["./tests/setupFilesAfterEnv.ts"],
    alias: {
      "@src": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../shared"),
      "@config": path.resolve(__dirname, "../../shared/config"),
    },
  },
  define: {
    LOG_LEVEL: '"error"',
  },
});
