import { compileCircuit } from "./utils";
import * as circom_tester from "circom_tester";

describe("Multiplier2 Circuit Tests", function () {
  let circuit: CircomTester.CircuitInstance;

  beforeAll(async function (): Promise<void> {
    try {
      circuit = await compileCircuit("./multiplier2/multiplier2.circom");
    } catch (error) {
      console.error("Failed to load circuit:", error);
      throw error;
    }
  }, 30000);

  describe("Basic Multiplication", function (): void {
    const testCases = [
      { a: 3, b: 11, expected: 33 },
      { a: 7, b: 6, expected: 42 },
      { a: 0, b: 5, expected: 0 },
      { a: 12345, b: 67890, expected: 12345 * 67890 },
    ];

    testCases.forEach(({ a, b, expected }): void => {
      test(`should generate witness for ${a} x ${b}`, async function (): Promise<void> {
        const input = { a, b };
        const witness: bigint[] = await circuit.calculateWitness(input);

        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { c: BigInt(expected) });
      });
    });
  });
});