const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  log: 4,
};

type LogLevel = keyof typeof LOG_LEVELS;

interface GlobalWithLogLevel {
  LOG_LEVEL?: LogLevel;
}

function shouldLog(level: LogLevel): boolean { 
  return LOG_LEVELS[level] <= LOG_LEVELS[(globalThis as GlobalWithLogLevel).LOG_LEVEL || "error"];
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
