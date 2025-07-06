jest.setTimeout(60000); // 60 seconds

global.console = {
  ...console,
  // Comment out to show the logs
  log: jest.fn(),
  debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

beforeEach((): void => {
  jest.clearAllMocks();
});

afterEach((): void => { });