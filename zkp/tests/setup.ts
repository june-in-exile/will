import { WitnessTester } from "./utils";

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  log: 4,
} as const;

function shouldLog(level: LogLevel): boolean {
  const currentLevel = (globalThis as GlobalThis).LOG_LEVEL || "error";
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

globalThis.console = {
  ...console,
  log: shouldLog("log") ? console.log : jest.fn(),
  debug: shouldLog("debug") ? console.debug : jest.fn(),
  info: shouldLog("info") ? console.info : jest.fn(),
  warn: shouldLog("warn") ? console.warn : jest.fn(),
  error: shouldLog("error") ? console.error : jest.fn(),
};

beforeAll((): void => {
  WitnessTester.initializeConstraints();
});

beforeEach((): void => {});

afterEach((): void => {});
