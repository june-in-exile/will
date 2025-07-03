import { compile_wasm } from "./utils";
const circom_tester = require("circom_tester");

describe("Multiplier2 Circuit", function () {
  let circuit: CircomTester.CircuitInstance;

  beforeAll(async function (): Promise<void> {
    try {
      circuit = await compile_wasm("./multiplier2/multiplier2.circom");
    } catch (error) {
      console.error("Failed to load circuit:", error);
      throw error;
    }
  }, 30000);

  describe("Basic Multiplication", function (): void {
    const testCases = [
      { a: 3, b: 11, c: 33 },
      { a: 7, b: 6, c: 42 },
      { a: 0, b: 5, c: 0 },
      { a: 12345, b: 67890, c: 12345 * 67890 },
    ];

    testCases.forEach(({ a, b, c }): void => {
      test(`should validate ${a} x ${b} = ${c}`, async function (): Promise<void> {
        const input = { a, b };
        const witness: bigint[] = await circuit.calculateWitness(input);

        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { c });
      });
    });
  });
});