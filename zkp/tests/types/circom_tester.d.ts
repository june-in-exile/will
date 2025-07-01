declare module "circom_tester" {
  export interface CircuitTester {
    wasm(circuitPath: string): Promise<CircuitInstance>;
    c(circuitPath: string): Promise<CircuitInstance>;
  }

  export interface CircuitInstance {
    calculateWitness(input: Record<string, unknown>): Promise<bigint[]>;
    checkConstraints(witness: bigint[]): Promise<void>;
    loadSymbols(): Promise<void>;
    loadConstraints(): Promise<void>;
    assertOut(
      witness: bigint[],
      expectedOut: Record<string, unknown>
    ): Promise<void>;
  }

  const circom_tester: CircuitTester;
  export { circom_tester };

  export default circom_tester;
}
