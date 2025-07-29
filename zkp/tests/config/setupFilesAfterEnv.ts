const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  log: 4,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

declare global {
  namespace globalThis {
    var LOG_LEVEL: LogLevel;
    var console: typeof console;
  }
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = globalThis.LOG_LEVEL || "error";
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

globalThis.console = {
  ...console,
  log: shouldLog("log") ? console.log : vi.fn(),
  debug: shouldLog("debug") ? console.debug : vi.fn(),
  info: shouldLog("info") ? console.info : vi.fn(),
  warn: shouldLog("warn") ? console.warn : vi.fn(),
  error: shouldLog("error") ? console.error : vi.fn(),
};

export { };
