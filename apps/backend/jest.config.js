export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: [
    "<rootDir>/tests"
  ],
  testMatch: [
    "**/?(*.)+(spec|test).ts"
  ],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../../shared/$1",
    "^@constant/(.*)$": "<rootDir>/../../shared/constant/$1",
    "^@type/(.*)$": "<rootDir>/../../shared/type/$1",
    "^@util/(.*)$": "<rootDir>/../../shared/util/$1",
    "^@config$": "<rootDir>/../../shared/config"
  },
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup.ts"
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts"
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "html"
  ],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};