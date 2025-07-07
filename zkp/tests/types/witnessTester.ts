/** An integer value is a numerical string, a number, or a bigint. */
export type IntegerValueType = `${number}` | number | bigint;

/** A signal value is a number, or an array of numbers (recursively). */
export type SignalValueType = IntegerValueType | SignalValueType[];

/**
 * An object with string keys and array of numerical values.
 * Each key represents a signal name as it appears in the circuit.
 *
 * By default, signal names are not typed, but you can pass an array of signal names
 * to make them type-safe, e.g. `CircuitSignals<['sig1', 'sig2']>`
 */
export type CircuitSignals<T extends readonly string[] = []> = T extends []
  ? { [signal: string]: SignalValueType }
  : { [signal in T[number]]: SignalValueType };

/** A witness is an array of `bigint`s, corresponding to the values of each wire in the evaluation of the circuit. */
export type WitnessType = bigint[];

/**
 * Symbols are a mapping of each circuit `wire` to an object with three keys. Within them,
 * the most important is `varIdx` which indicates the position of this signal in the witness array.
 */
export type SymbolsType = {
  [symbol: string]: {
    labelIdx: number;
    varIdx: number;
    componentIdx: number;
  };
};

/** A configuration object for circuit compilation. */
export type CompilationOptions = {
  /** Parameters to pass to the template */
  templateParams?: string[];
  /** List of public signals for the template */
  templatePublicSignals?: string[];
  /** Optimization level (0-2, default: 2) */
  O?: ConstraintSimplification;
  /** Enable verbose output during compilation (default: false) */
  verbose?: boolean;
  /** Enable inspection mode for debugging (default: false) */
  inspect?: boolean;
  /** Output constraints in JSON format (default: false) */
  json?: boolean;
  /** Force recompilation even if compiled version exists (default: true) */
  recompile?: boolean;
  /** Elliptic curve to use for the field (default: "bn128") */
  prime?: CurveName;
  /** Enable simplification substitution optimization (default: false) */
  simplification_substitution?: boolean;
  /** Disable assembly generation (default: false) */
  no_asm?: boolean;
  /** Skip initialization phase (default: false) */
  no_init?: boolean;
};

/**
 * A simple type-wrapper for `circom_tester` WASM tester class.
 * Not all functions may exist here, some are omitted.
 * @see https://github.com/iden3/circom_tester/blob/main/wasm/tester.js
 */
export type CircomTester = {
  calculateWitness: (
    input: CircuitSignals,
    sanityCheck: boolean,
  ) => Promise<WitnessType>;

  loadConstraints: () => Promise<void>;
  constraints: unknown[] | undefined;

  checkConstraints: (witness: WitnessType) => Promise<void>;
  
  assertOut: (
    actualOut: WitnessType,
    expectedOut: CircuitSignals,
  ) => Promise<void>;

  loadSymbols: () => Promise<void>;
  symbols: SymbolsType | undefined;
  
  getDecoratedOutput: (witness: WitnessType) => Promise<string>;
  dir: string;
  baseName: string;

  release: () => Promise<void>;
};
