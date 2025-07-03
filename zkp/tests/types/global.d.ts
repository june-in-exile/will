declare global {
  // Reference: https://github.com/iden3/circom_tester/blob/de724233bab248824c4e6214374261a3b1d804a5/wasm/tester.js#L28
  // namespace CircomTester {
  //   interface CircuitInstance {
  //     /**
  //      * Calculates the witness for the circuit using the provided input.
  //      */
  //     calculateWitness(
  //       input: Record<string, unknown>,
  //       sanityCheck?: boolean,
  //     ): Promise<bigint[]>;

  //     /**
  //      * Verifies that all constraints are satisfied by the witness.
  //      */
  //     checkConstraints(witness: bigint[]): Promise<void>;

  //     /**
  //      * Loads the signal symbol map.
  //      */
  //     loadSymbols(): Promise<void>;

  //     /**
  //      * Loads all r1cs constraints.
  //      */
  //     loadConstraints(): Promise<void>;

  //     /**
  //      * Asserts that the output signals match the expected values.
  //      */
  //     assertOut(
  //       witness: bigint[],
  //       expectedOut: Record<string, unknown>,
  //     ): Promise<void>;

  //     /**
  //      * Gets decorated output
  //      * Including the mapping of var name and value.
  //      */
  //     getDecoratedOutput(witness: bigint[]): Promise<string>;

  //     /**
  //      * Gets the witness value corresponding to given output format
  //      */
  //     getOutput(
  //       witness: bigint[],
  //       expectedOutStructure: Record<string, any>,
  //       templateName?: string,
  //     ): Promise<Record<string, any>>;
  //   }

  //   interface CircuitTester {
  //     wasm(
  //       circuitPath: string,
  //       options?: {
  //         include?: string[];
  //         output?: string;
  //         compileFlags?: string[];
  //         templateName?: string;
  //         templateParams?: any[];
  //         templatePublicSignals?: string[];
  //         recompile?: boolean;
  //         [key: string]: any;
  //       },
  //     ): Promise<CircuitInstance>;

  //     c(
  //       circuitPath: string,
  //       options?: {
  //         include?: string[];
  //         output?: string;
  //         compileFlags?: string[];
  //         templateName?: string;
  //         templateParams?: any[];
  //         templatePublicSignals?: string[];
  //         recompile?: boolean;
  //         [key: string]: any;
  //       },
  //     ): Promise<CircuitInstance>;
  //   }
  // }

  // const circom_tester: CircomTester.CircuitTester;

  type Optimization = 0 | 1 | 2;

  type CurveName =
    | 'bn128'
    | 'bls12377'
    | 'bls12381'
    | 'goldilocks'
    | 'grumpkin'
    | 'pallas'
    | 'secq256r1'
    | 'vesta';
}

export { };