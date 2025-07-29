import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules'],
    slowTestThreshold: 30000,  // Mark tests as slow if they take longer than 30 seconds
    testTimeout: 60000,        // Individual test case timeout (fail after 60 seconds)
    hookTimeout: 300000,       // Hook timeout for beforeAll/afterAll etc (5 minutes)
    setupFiles: ['./tests/config/setupFilesAfterEnv.ts'],
    globalSetup: ['./tests/config/globalSetup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  define: {
    LOG_LEVEL: '"error"',
    CIRCOM_DEFAULTS: JSON.stringify({
      O: 2,
      verbose: false,
      inspect: false,
      json: false,
      recompile: true,
      prime: 'bn128',
      simplification_substitution: false,
      no_asm: false,
      no_init: false,
    }),
    CONSTRAINT_COUNTS_PATH: '"./constraintCounts.json"',
  },
});