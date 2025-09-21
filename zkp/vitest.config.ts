import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.ts", "tests/**/*.heavy.{test,spec}.ts"],
    exclude: ["node_modules"],
    hookTimeout: 60_000, // 1 minute to compile circuit
    testTimeout: 10_000, // 10 seconds to calculate witness and verify
    slowTestThreshold: 5_000,
    setupFiles: ["./tests/config/setupFilesAfterEnv.ts"],
    globalSetup: ["./tests/config/globalSetup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  define: {
    LOG_LEVEL: '"log"', // error < warn < info < debug < log
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
