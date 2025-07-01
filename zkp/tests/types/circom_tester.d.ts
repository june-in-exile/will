declare module "circom_tester" {
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
  
  export interface CircuitTester {
    wasm(
      circuitPath: string,
      options?: {
        include?: string[];
        [key: string]: any;
      }
    ): Promise<CircuitInstance>;
    c(
      circuitPath: string,
      options?: {
        include?: string[];
        [key: string]: any;
      }
    ): Promise<CircuitInstance>;
  }

  export const circom_tester: CircuitTester;

  const circom_tester_default: CircuitTester;
  export default circom_tester_default;
}
