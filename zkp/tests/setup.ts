import { LOG_LEVELS } from './types/constants';

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

beforeEach((): void => {
  jest.clearAllMocks();
});

afterEach((): void => { });
