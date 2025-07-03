jest.setTimeout(60000); // 60 seconds

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

global.console = {
  ...console,
  // Mute the logs
  //   log: jest.fn(),
  //   debug: jest.fn(),
  info: console.info,
  warn: console.warn,
  error: console.error,
};

beforeEach((): void => {
  jest.clearAllMocks();
});

afterEach((): void => {});

process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>): void => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  },
);

const originalConsoleError = console.error;
console.error = (...args: unknown[]): void => {
  const message: string = args.join(" ");
  if (message.includes("Warning: Circom")) {
  }
  originalConsoleError.apply(console, args);
};

export function isCircuitInstance(obj: unknown): obj is {
  calculateWitness(input: { char: number }): Promise<bigint[]>;
  checkConstraints(witness: bigint[]): Promise<void>;
} {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "calculateWitness" in obj &&
    "checkConstraints" in obj &&
    typeof (obj as any).calculateWitness === "function" &&
    typeof (obj as any).checkConstraints === "function"
  );
}

export const BASE64_CONSTANTS = {
  UPPERCASE_START: 65, // 'A'
  UPPERCASE_END: 90, // 'Z'
  LOWERCASE_START: 97, // 'a'
  LOWERCASE_END: 122, // 'z'
  DIGIT_START: 48, // '0'
  DIGIT_END: 57, // '9'
  PLUS_CHAR: 43, // '+'
  SLASH_CHAR: 47, // '/'
  EQUALS_CHAR: 61, // '='
} as const;

export function generateTestCases(
  start: number,
  end: number,
  baseValue: number,
): Array<{ ascii: number; expected: number }> {
  const cases: Array<{ ascii: number; expected: number }> = [];
  for (let i = start; i <= end; i++) {
    cases.push({
      ascii: i,
      expected: baseValue + (i - start),
    });
  }
  return cases;
}

export function validateWitnessStructure(witness: bigint[]): void {
  expect(witness).toBeInstanceOf(Array);
  expect(witness.length).toBeGreaterThan(2);
  expect(witness[0]).toBe(BigInt(1));
}
