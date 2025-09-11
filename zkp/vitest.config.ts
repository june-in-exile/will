import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: ["node_modules"],
    slowTestThreshold: 60000, // Mark tests as slow if they take longer than 1 minute
    testTimeout: 300000, // Individual test case timeout (fail after 5 minutes)
    hookTimeout: 1200000, // Hook timeout for beforeAll/afterAll etc (20 minutes)
    setupFiles: ["./tests/config/setupFilesAfterEnv.ts"],
    globalSetup: ["./tests/config/globalSetup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  define: {
    LOG_LEVEL: '"error"', // error < warn < info < debug < log
    INCLUDE_LIB: ["circomlib", "keccak256-circom"],
    CIRCOM_TESTER_DEFAULTS: JSON.stringify({
      O: 2,
      verbose: false,
      inspect: false,
      json: false,
      recompile: true,
      prime: "bn128",
      simplification_substitution: false,
      no_asm: false,
      no_init: false,
    }),
    CIRCOM_TESTER_OUTPUT_DIR: '"./circuits/test"',
    CONSTRAINT_COUNTS_PATH: '"./constraintCounts.json"',
  },
});
