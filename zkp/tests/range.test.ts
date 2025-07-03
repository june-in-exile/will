import { compile_wasm as compile_wasm } from "./utils";
const circom_tester = require("circom_tester");

describe("InRange Circuit", function () {
  describe("Basic 4-bit Range Validation", function (): void {
    let circuit: CircomTester.CircuitInstance;

    beforeAll(async function (): Promise<void> {
      try {
        circuit = await compile_wasm("./shared/components/range.circom", {
          templateParams: ["4"],
        });
      } catch (error) {
        console.error("Failed to load InRange circuit:", error);
        throw error;
      }
    }, 30000);

    test("should validate full range [0, 15]", async function (): Promise<void> {
      for (let value = 0; value <= 15; value++) {
        const witness = await circuit.calculateWitness({
          in: value,
          min: 0,
          max: 15,
        });
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { out: 1 });
      }
    });

    test("should validate custom range [3, 8]", async function (): Promise<void> {
      const min = 3,
        max = 8;
      for (let value = 0; value <= 15; value++) {
        const expected = min <= value && value <= max ? 1 : 0;
        const witness = await circuit.calculateWitness({ in: value, min, max });
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { out: expected });
      }
    });

    test("should contraint in, min and max", async function (): Promise<void> {
      const testCases = [
        { in: 16, min: 0, max: 15 },
        { in: 5, min: 16, max: 20 },
        { in: 18, min: 16, max: 20 },
        { in: 10, min: 16, max: 8 },
        { in: 5, min: 16, max: 8 },
        { in: 7, min: 0, max: 16 },
        { in: 7, min: 0, max: 20 },
        { in: 0, min: 7, max: 20 },
      ];

      for (const testCase of testCases) {
        await expect(circuit.calculateWitness(testCase)).rejects.toThrow();
      }
    });
  });

  describe("Basic 8-bit Range Validation", function (): void {
    let circuit: CircomTester.CircuitInstance;

    beforeAll(async function (): Promise<void> {
      try {
        circuit = await compile_wasm("./shared/components/range.circom", {
          templateParams: ["8"],
        });
      } catch (error) {
        console.error("Failed to load InRange circuit:", error);
        throw error;
      }
    }, 30000);

    test("should validate full range [0, 255]", async function (): Promise<void> {
      const testCases = [
        { in: 0, min: 0, max: 255 },
        { in: 1, min: 0, max: 255 },
        { in: 127, min: 0, max: 255 },
        { in: 254, min: 0, max: 255 },
        { in: 255, min: 0, max: 255 },
      ];

      for (const testCase of testCases) {
        const witness = await circuit.calculateWitness(testCase);
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { out: 1 });
      }
    });

    test("should validate custom range [10, 100]", async function (): Promise<void> {
      const testCases = [
        { in: 9, min: 10, max: 100, expected: 0 },
        { in: 10, min: 10, max: 100, expected: 1 },
        { in: 11, min: 10, max: 100, expected: 1 },
        { in: 50, min: 10, max: 100, expected: 1 },
        { in: 99, min: 10, max: 100, expected: 1 },
        { in: 100, min: 10, max: 100, expected: 1 },
        { in: 101, min: 10, max: 100, expected: 0 },
      ];

      for (const testCase of testCases) {
        const witness = await circuit.calculateWitness({
          in: testCase.in,
          min: testCase.min,
          max: testCase.max,
        });
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { out: testCase.expected });
      }
    });

    test("should handle exact boundary values correctly", async function (): Promise<void> {
      const testCases = [
        { in: 49, min: 50, max: 200, expected: 0 },
        { in: 50, min: 50, max: 200, expected: 1 },
        { in: 51, min: 50, max: 200, expected: 1 },
        { in: 199, min: 50, max: 200, expected: 1 },
        { in: 200, min: 50, max: 200, expected: 1 },
        { in: 201, min: 50, max: 200, expected: 0 },
      ];

      for (const testCase of testCases) {
        const witness = await circuit.calculateWitness({
          in: testCase.in,
          min: testCase.min,
          max: testCase.max,
        });
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { out: testCase.expected });
      }
    });
  });
});
