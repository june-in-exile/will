// Modified from circomkit: https://github.com/erhant/circomkit/blob/main/src/testers/witnessTester.ts

import { construct_wasm } from "./construction.js";
import { AssertionError } from "assert";
import path from "path";
import fs from "fs";
import { createInterface } from "readline";

type Constraints = {
  [testFileName: string]: {
    [templateName: string]: {
      [description: string]: number;
    };
  };
};

type ConstraintSimplification = 0 | 1 | 2;

type CurveName =
  | "bn128"
  | "bls12377"
  | "bls12381"
  | "goldilocks"
  | "grumpkin"
  | "pallas"
  | "secq256r1"
  | "vesta";

/** An integer value is a numerical string, a number, or a bigint. */
type IntegerValueType = `${number}` | number | bigint;

/** A signal value is a number, or an array of numbers (recursively). */
type SignalValueType = IntegerValueType | SignalValueType[];

/** A bus a collection of different but related signals (recursively). */
type BusStructType =
  | { [key: string]: SignalValueType | BusStructType }
  | Array<{ [key: string]: SignalValueType | BusStructType }>;

/**
 * An object mapping signal names to their values, which can be either flat signals or structured (nested) bus signals.
 * Each key represents a signal name as it appears in the circuit.
 *
 * A signal value can be:
 *   - A single integer value (number, bigint, or numeric string),
 *   - An array of such values (e.g., for vectors or memory),
 *   - Or a nested bus object (BusStructType), which recursively groups related signals.
 *
 * By default, signal names are not typed, but you can pass an array of signal names to make them type-safe,
 *   e.g. `CircuitSignals<['sig1', 'sig2']>`
 *
 * @note Input is assumed to be a map from signals to arrays of bigints
 *   - incorrect: [{key1: value11, key2: value12}, {key1: value21, key2: value22}]
 *   - correct: [value11, value12, value21, value22]
 */
type CircuitInputOutput<T extends readonly string[] = []> = T extends []
  ? { [signal: string]: SignalValueType | BusStructType }
  : { [signal in T[number]]: SignalValueType | BusStructType };

/** A witness is an array of `bigint`s, corresponding to the values of each wire in the evaluation of the circuit. */
type WitnessType = bigint[];

/**
 * Symbols are a mapping of each circuit `wire` to an object with three keys.
 * Within them, the most important is `varIdx` which indicates the position of this signal in the witness array.
 */
type SymbolsType = {
  [symbol: string]: {
    labelIdx: number;
    varIdx: number;
    componentIdx: number;
  };
};

/** A configuration object for circuit compilation. */
type CompilationOptions = {
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
type CircomTester = {
  calculateWitness: (
    input: CircuitInputOutput,
    sanityCheck: boolean,
  ) => Promise<WitnessType>;

  templateName: string; // Customized

  loadConstraints: () => Promise<void>;
  constraints: unknown[] | undefined;

  checkConstraints: (witness: WitnessType) => Promise<void>;

  assertOut: (
    actualOut: WitnessType,
    expectedOut: CircuitInputOutput,
  ) => Promise<void>;

  loadSymbols: () => Promise<void>;
  symbols: SymbolsType | undefined;

  getDecoratedOutput: (witness: WitnessType) => Promise<string>;
  dir: string;
  baseName: string;

  release: () => Promise<void>;
};

/** A utility class to test your circuits. Use `expectFail` and `expectPass` to test out evaluations. */
class WitnessTester<
  IN extends readonly string[] = [],
  OUT extends readonly string[] = [],
> {
  /** A dictionary of symbols, see {@link loadSymbols} */
  private symbols: SymbolsType | undefined;
  /** List of constraints, see {@link loadConstraints} */
  private constraints: unknown[] | undefined;
  /** Path to constraints file */
  private constraintsPath: string;

  constructor(
    /** The underlying `circom_tester` object */
    private circomTester: CircomTester,
  ) {
    this.constraintsPath = globalThis.CONSTRAINT_COUNTS_PATH;
  }

  static async construct(
    circuitPath: string,
    templateName: string,
    options?: CompilationOptions,
  ): Promise<WitnessTester> {
    try {
      const fileName = WitnessTester.getCurrentTestFilename();
      const circomTester = await construct_wasm(
        circuitPath,
        fileName,
        templateName,
        options,
      );
      return new WitnessTester(circomTester);
    } catch (error) {
      throw new Error(
        `Failed to construct witness tester: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Release resources and clean up temporary files.
   * This method should be called when the circuit is no longer needed.
   */
  async release(): Promise<void> {
    if (this.circomTester) {
      try {
        if (
          this.circomTester.dir &&
          typeof this.circomTester.dir === "string"
        ) {
          let dirToClean = this.circomTester.dir;

          // Check if this is a nested temporary directory structure
          // Look for the pattern: /tmp/circom_*/circuit_name/
          const parentDir = path.dirname(dirToClean);
          const parentName = path.basename(parentDir);

          // If parent directory looks like a circom temp dir, clean that instead
          if (parentName.startsWith("circom_")) {
            dirToClean = parentDir;
            console.log(`Cleaning up parent temp directory: ${dirToClean}`);
          } else {
            console.log(`Cleaning up circuit directory: ${dirToClean}`);
          }

          if (fs.existsSync(dirToClean)) {
            await fs.promises.rm(dirToClean, { recursive: true });
            console.log(`Successfully cleaned up: ${dirToClean}`);
          }
        }
      } catch (error) {
        console.warn(
          "Circuit cleanup failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
  }

  /** Compute witness given the input signals. */
  async calculateWitness(input: CircuitInputOutput<IN>): Promise<WitnessType> {
    return this.circomTester.calculateWitness(input, false);
  }

  /** Returns the number of constraints. */
  async getConstraintCount() {
    if (this.constraints === undefined) {
      await this.loadConstraints();
    }
    if (!this.constraints) {
      throw new Error("Constraints are not loaded.");
    }
    const numConstraints = this.constraints.length;
    return numConstraints;
  }

  /** Asserts that the circuit has enough constraints.
   *
   * By default, this function checks if there **at least** `expected` many constraints in the circuit.
   * If `exact` option is set to `true`, it will also check if the number of constraints is exactly equal to
   * the `expected` amount.
   *
   * If first check fails, it means the circuit is under-constrained. If the second check fails, it means
   * the circuit is over-constrained.
   */
  async expectConstraintCount(expected: number, exact?: boolean) {
    const count = await this.getConstraintCount();
    if (count < expected) {
      throw new AssertionError({
        message: "Circuit is under-constrained",
        expected,
        actual: count,
      });
    }

    if (exact && count !== expected) {
      throw new AssertionError({
        message: "Circuit is over-constrained",
        expected,
        actual: count,
      });
    }
  }

  /** Assert that constraints are valid for a given witness. */
  async expectConstraintPass(witness: WitnessType): Promise<void> {
    return this.circomTester.checkConstraints(witness);
  }

  /**
   * Assert that constraints are NOT valid for a given witness.
   * This is useful to test if a fake witness (a witness from a
   * dishonest prover) can still be valid, which would indicate
   * that there are soundness errors in the circuit.
   */
  async expectConstraintFail(witness: WitnessType): Promise<void> {
    await this.circomTester.checkConstraints(witness).then(
      () => {
        throw new AssertionError({
          message: "Expected constraints to not match.",
        });
      },
      (err) => {
        if (err.message !== "Constraint doesn't match") {
          throw new AssertionError({ message: err.message });
        }
      },
    );
  }

  /** Expect an input to pass assertions and match the output.
   *
   * If `output` is omitted, it will only check for constraints to pass.
   */
  async expectPass(
    input: CircuitInputOutput<IN>,
    output?: CircuitInputOutput<OUT>,
  ) {
    const witness = await this.calculateWitness(input);
    await this.expectConstraintPass(witness);
    if (output) {
      await this.assertOut(witness, output);
    }
  }

  /** Expect a witness computation to fail in the circuit.
   *
   * See [here](https://github.com/iden3/circom/blob/master/code_producers/src/wasm_elements/common/witness_calculator.js#L21)
   * for the list of errors that may occur during witness calculation.
   * Most of the time, you will be expecting an assertion error.
   *
   * @returns the error message.
   */
  async expectFail(input: CircuitInputOutput<IN>): Promise<string> {
    return await this.calculateWitness(input).then(
      () => {
        throw new AssertionError({
          message: "Expected witness calculation to fail.",
        });
      },
      (err) => {
        const errorMessage = (err as Error).message;

        const isExpectedError = [
          "Error: Assert Failed.", // a constraint failure (most common)
          "Not enough values for input signal", // few inputs than expected for a signal
          "Too many values for input signal", // more inputs than expected for a signal
          "Not all inputs have been set.", // few inputs than expected for many signals
        ].some((msg) => errorMessage.startsWith(msg));

        // throw unhandled error anyways
        if (!isExpectedError) throw err;

        return errorMessage;
      },
    );
  }

  /**
   * Computes the witness.
   * This is a shorthand for calculating the witness and calling {@link readSignals}, {@link readSymbols} on the result.
   */
  async compute(
    input: CircuitInputOutput<IN>,
    signals?: string[] | OUT,
  ): Promise<CircuitInputOutput> {
    // compute witness & check constraints
    const witness = await this.calculateWitness(input);
    await this.expectConstraintPass(witness);

    return signals
      ? await this.readSignals(witness, signals)
      : await this.readSymbols(witness);
  }

  /**
   * Override witness value to try and fake a proof. If the circuit has soundness problems (i.e.
   * some signals are not constrained correctly), then you may be able to create a fake witness by
   * overriding specific values, and pass the constraints check.
   *
   * The symbol names must be given in full form, not just as the signal is named in the circuit code. In
   * general a symbol name looks something like:
   *
   * - `main.signal`
   * - `main.component.signal`
   * - `main.component.signal[n][m]`
   *
   * You will likely call `expectConstraintPass` on the resulting fake witness to see if it can indeed fool
   * a verifier.
   * @see {@link expectConstraintPass}
   */
  async editWitness(
    witness: Readonly<WitnessType>,
    symbolValues: { [symbolName: string]: bigint },
  ): Promise<WitnessType> {
    await this.loadSymbols();

    const fakeWitness = witness.slice();
    for (const symbolName in symbolValues) {
      // get corresponding symbol
      if (!this.symbols) {
        throw new Error("Symbols are not loaded.");
      }
      const symbolInfo = this.symbols[symbolName];
      if (symbolInfo === undefined) {
        throw new Error("Invalid symbol name: " + symbolName);
      }

      // override with user value
      fakeWitness[symbolInfo.varIdx] = symbolValues[symbolName];
    }

    return fakeWitness;
  }

  /** Read symbol values from a witness. */
  async readSymbols(
    witness: Readonly<WitnessType>,
    symbols?: string[],
  ): Promise<Record<string, bigint>> {
    if (symbols) {
      await this.loadSpecificSymbols(symbols);
    } else {
      await this.loadSymbols();
    }

    if (!this.symbols) {
      throw new Error("Symbols are not loaded.");
    }

    const symbolsToRead = symbols ?? Object.keys(this.symbols);

    const ans: Record<string, bigint> = {};
    for (const symbolName of symbolsToRead) {
      // get corresponding symbol
      const symbolInfo = this.symbols[symbolName];
      if (symbolInfo === undefined) {
        throw new Error("Invalid symbol name: " + symbolName);
      }

      // add symbol value to result
      ans[symbolName] = witness[symbolInfo.varIdx];
    }

    return ans;
  }

  /**
   * Read signals from a witness.
   *
   * This is not the same as {@link readSymbols} in the sense that the entire value represented by a signal
   * will be returned here. For example, instead of reading `main.out[0], main.out[1], main.out[2]` with `readWitness`,
   * you can simply query `out` in this function and an object with `{out: [...]}` will be returned.
   *
   * To read signals within a component, simply refer to them as `component.signal`. In other words, omit the `main.` prefix
   * and array dimensions.
   */
  async readSignals(
    witness: Readonly<WitnessType>,
    signals: string[] | OUT,
  ): Promise<CircuitInputOutput> {
    await this.loadSymbols();

    // for each out signal, process the respective symbol
    const entries: [OUT[number], SignalValueType][] = [];

    // returns the dot count in the symbol
    // for example `main.inner.in` has 2 dots
    function dotCount(s: string): number {
      return s.split(".").length;
    }

    for (const signal of signals) {
      // if our symbol has N dots (0 for `main` signals), we must filter symbols that have different
      // amount of dots. this shall speed-up the rest of the algorithm, as symbol count may be large
      // non-main signals have an additional `.` in them after `main.symbol`
      const signalDotCount = dotCount(signal) + 1; // +1 for the dot in `main.`
      const signalLength = signal.length + 5; // +5 for prefix `main.`
      if (!this.symbols) {
        throw new Error("Symbols are not loaded.");
      }
      const symbolNames = Object.keys(this.symbols).filter(
        (s) => s.startsWith(`main.${signal}`) && signalDotCount === dotCount(s),
      );

      // get the symbol values from symbol names, ignoring `main.` prefix
      // the matched symbols must exactly equal the signal
      const matchedSymbols = symbolNames.filter((s) => {
        const i = s.indexOf("[");
        if (i === -1) {
          // not an array signal
          return s.length === signalLength;
        } else {
          // an array signal, we only care about the symbol name
          return s.slice(0, i).length === signalLength;
        }
      });

      if (matchedSymbols.length === 0) {
        // no matches!
        throw new Error("No symbols matched for signal: " + signal);
      } else if (matchedSymbols.length === 1) {
        // easy case, just return the witness of this symbol
        if (!this.symbols) {
          throw new Error("Symbols are not loaded.");
        }
        entries.push([signal, witness[this.symbols[matchedSymbols[0]].varIdx]]);
      } else {
        // since signal names are consequent, we only need to know the witness index of the first symbol
        if (!this.symbols) {
          throw new Error("Symbols are not loaded.");
        }
        let idx = this.symbols[matchedSymbols[0]].varIdx;

        // we can assume that a symbol with this name appears only once in a component, and that the depth is same for
        // all occurrences of this symbol, given the type system used in Circom. So, we can just count the number
        // of `[`s in any symbol of this signal to find the number of dimensions of this signal.
        // we particularly choose the last symbol in the array, as that holds the maximum index of each dimension of this array.
        const lastMatchedSymbol = matchedSymbols.at(-1);
        if (!lastMatchedSymbol) {
          throw new Error("No matched symbols found for signal: " + signal);
        }
        const splits = lastMatchedSymbol.split("[");

        // since we chose the last symbol, we have something like `main.signal[dim1][dim2]...[dimN]` which we can parse
        const dims = splits
          .slice(1)
          .map((dim) => parseInt(dim.slice(0, -1)) + 1); // +1 is needed because the final value is 0-indexed

        // at this point, we have an array of signals like `main.signal[0..dim1][0..dim2]..[0..dimN]`
        // and we must construct the necessary multi-dimensional array out of it.
        // eslint-disable-next-line no-inner-declarations
        function processDepth(d: number): SignalValueType {
          const acc: SignalValueType = [];
          if (d === dims.length - 1) {
            // final depth, count witnesses
            for (let i = 0; i < dims[d]; i++) {
              acc.push(witness[idx++]);
            }
          } else {
            // not final depth, recurse to next
            for (let i = 0; i < dims[d]; i++) {
              acc.push(processDepth(d + 1));
            }
          }
          return acc;
        }
        entries.push([signal, processDepth(0)]);
      }
    }

    return Object.fromEntries(entries) as CircuitInputOutput<OUT>;
  }

  /**
   * Record constraint count for a specific circuit and description
   * @param description - Description of the constraint test
   * @param testFileName - Optional test file name (will auto-detect if not provided)
   */
  async setConstraint(
    description: string,
    testFileName?: string,
  ): Promise<void> {
    const finalTestFileName =
      testFileName || WitnessTester.getCurrentTestFilename();
    const templateName = this.circomTester.templateName;
    const constraintCount = await this.getConstraintCount();
    console.log(`${description}: ${constraintCount}`);

    let constraints: Constraints = {};

    // Load existing constraints if file exists
    if (fs.existsSync(this.constraintsPath)) {
      try {
        const data = fs.readFileSync(this.constraintsPath, "utf8");
        constraints = JSON.parse(data);
      } catch (error) {
        console.warn(`Warning: Could not parse existing constraints: ${error}`);
        constraints = {};
      }
    }

    // Initialize test file category if it doesn't exist
    if (!constraints[finalTestFileName]) {
      constraints[finalTestFileName] = {};
    }

    // Initialize template name category if it doesn't exist
    if (!constraints[finalTestFileName][templateName]) {
      constraints[finalTestFileName][templateName] = {};
    }

    // Update the constraint count
    constraints[finalTestFileName][templateName][description] = constraintCount;

    // Write back to file with pretty formatting
    try {
      fs.writeFileSync(
        this.constraintsPath,
        JSON.stringify(constraints, null, 2),
      );
    } catch (error) {
      console.error(`Error writing constraints: ${error}`);
    }
  }

  /**
   * Get constraint count for a specific circuit and description
   * @param testFileName - The test file name (without .test.ts extension)
   * @param templateName - The circuit template name
   * @param description - Description of the constraint test
   * @returns The constraint count or null if not found
   */
  getConstraint(
    testFileName: string,
    templateName: string,
    description: string,
  ): number | null {
    if (!fs.existsSync(this.constraintsPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(this.constraintsPath, "utf8");
      const constraints: Constraints = JSON.parse(data);

      return constraints[testFileName]?.[templateName]?.[description] || null;
    } catch (error) {
      console.warn(`Warning: Could not read constraints: ${error}`);
      return null;
    }
  }

  /**
   * @note https://github.com/iden3/circom_tester/issues/36
   *
   * Assert the output of a given witness.
   * @param actualOut expected witness
   * @param expectedOut computed output signals
   */
  private async assertOut(
    actualOut: WitnessType,
    expectedOut: CircuitInputOutput<OUT>,
  ): Promise<void> {
    // return this.circomTester.assertOut(actualOut, expectedOut);
    if (!this.symbols) await this.loadSymbols();

    const checkObject = (prefix: string, eOut: any) => {
      if (Array.isArray(eOut)) {
        for (let i = 0; i < eOut.length; i++) {
          checkObject(prefix + "[" + i + "]", eOut[i]);
        }
      } else if (
        typeof eOut === "object" &&
        eOut.constructor.name === "Object"
      ) {
        for (const k in eOut) {
          checkObject(prefix + "." + k, eOut[k]);
        }
      } else {
        if (typeof this.symbols![prefix] === "undefined") {
          throw new Error("Output variable not defined: " + prefix);
        }
        const ba = actualOut[this.symbols![prefix].varIdx].toString();
        const be = eOut.toString();
        if (ba !== be) {
          throw new Error(
            `Assertion failed for ${prefix}: expected ${be}, got ${ba}`,
          );
        }
      }
    };

    checkObject("main", expectedOut);
  }

  /** Loads the list of R1CS constraints to `this.constraints`. */
  private async loadConstraints(): Promise<void> {
    await this.circomTester.loadConstraints();
    this.constraints = this.circomTester.constraints;
  }

  /**
   * Loads the symbols in a dictionary at `this.symbols`
   * Symbols are stored under the .sym file
   *
   * Each line has 4 comma-separated values:
   *
   * 1.  label index
   * 2.  variable index
   * 3.  component index
   * 4.  symbol name
   *
   * @note https://github.com/iden3/circom_tester/issues/36
   */
  private async loadSymbols(): Promise<void> {
    // await this.circomTester.loadSymbols();
    if (this.circomTester.symbols) return;

    this.circomTester.symbols = {};
    const fileStream = fs.createReadStream(
      path.join(this.circomTester.dir, this.circomTester.baseName + ".sym"),
      { encoding: "utf8" },
    );
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const arr = line.split(",");
      if (arr.length !== 4) {
        continue;
      }

      this.circomTester.symbols[arr[3]] = {
        labelIdx: Number(arr[0]),
        varIdx: Number(arr[1]),
        componentIdx: Number(arr[2]),
      };
    }

    this.symbols = this.circomTester.symbols;
  }

  /** Faster alternative to this.circomTester.loadSymbols(),
   *  stops once all the requested symbols are found */
  private async loadSpecificSymbols(symbolsRequested: string[]): Promise<void> {
    if (!this.symbols) this.symbols = {}; // Init if missing

    // Identify which symbols are still needed
    const symbolsToFind = new Set(
      symbolsRequested.filter((s) => !this.symbols?.[s]),
    );
    if (symbolsToFind.size === 0) return;

    // Read the symbols file into memory
    const symbolsFile = await fs.promises.readFile(
      path.join(this.circomTester.dir, this.circomTester.baseName + ".sym"),
      "utf8",
    );

    // Start looking for the requested symbols
    for (const line of symbolsFile.split("\n")) {
      if (symbolsToFind.size === 0) return; // Stop when all found

      const [labelIdx, varIdx, componentIdx, symbolName] = line.split(",");
      if (!symbolName || !symbolsToFind.has(symbolName)) continue; // Skip non-requested symbols

      // Add found symbols to the symbols map, like circomTester.loadSymbols()
      this.symbols[symbolName] = {
        labelIdx: Number(labelIdx),
        varIdx: Number(varIdx),
        componentIdx: Number(componentIdx),
      };
      symbolsToFind.delete(symbolName); // Remove from list
    }
  }

  /**
   * Helper method to get current test filename
   */
  private static getCurrentTestFilename(): string {
    try {
      // Try to get the test file from the call stack
      const stack = new Error().stack;
      if (stack) {
        const stackLines = stack.split("\n");
        for (const line of stackLines) {
          // Look for .test.ts files in the stack trace
          const match = line.match(/\/([^/]+\.test\.ts):/);
          if (match) {
            return match[1].replace(/\.(heavy\.)?test\.ts$/, "")
          }
        }
      }
    } catch {
      throw new Error("Cannot get the current filenmae");
    }

    return "unknownCircuitType";
  }
}

export { WitnessTester, type CompilationOptions, type CircomTester };
