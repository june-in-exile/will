import { LOG_LEVELS, LogLevel } from "./types";

interface GlobalWithLogLevel {
  LOG_LEVEL?: LogLevel;
}

const logLevel =
  // (globalThis as unknown as GlobalWithLogLevel).LOG_LEVEL || "error";
  (globalThis as GlobalWithLogLevel).LOG_LEVEL || "error";

const currentLogLevel = LOG_LEVELS[logLevel as LogLevel] || 0;

const shouldLog = (level: keyof typeof LOG_LEVELS): boolean => {
  return LOG_LEVELS[level] <= currentLogLevel;
};

global.console = {
  ...console,
  log: shouldLog("log") ? console.log : jest.fn(),
  debug: shouldLog("debug") ? console.debug : jest.fn(),
  info: shouldLog("info") ? console.info : jest.fn(),
  warn: shouldLog("warn") ? console.warn : jest.fn(),
  error: shouldLog("error") ? console.error : jest.fn(),
};

beforeEach((): void => {
  jest.clearAllMocks();
});

afterEach((): void => {});
