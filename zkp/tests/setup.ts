const logLevel = (global as any).LOG_LEVEL || 'error';

export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  log: 4
};

const currentLogLevel = LOG_LEVELS[logLevel as keyof typeof LOG_LEVELS] || 0;

const shouldLog = (level: keyof typeof LOG_LEVELS): boolean => {
  return LOG_LEVELS[level] <= currentLogLevel;
};

global.console = {
  ...console,
  log: shouldLog('log') ? console.log : jest.fn(),
  debug: shouldLog('debug') ? console.debug : jest.fn(),
  info: shouldLog('info') ? console.info : jest.fn(),
  warn: shouldLog('warn') ? console.warn : jest.fn(),
  error: shouldLog('error') ? console.error : jest.fn(),
};

beforeEach((): void => {
  jest.clearAllMocks();
});

afterEach((): void => { });