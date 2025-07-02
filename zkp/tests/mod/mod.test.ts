import { getCircomlib } from "../utils";
import path from "path";
const circom_tester = require("circom_tester");
import type { CircuitInstance } from "circom_tester";


describe("Modulo Circuit", function () {
  let mod8_4: CircuitInstance;  // 8-bit input, modulo 16 (2^4)
  // let circuit8_3: CircuitInstance;  // 8-bit input, modulo 8 (2^3)
  // let circuit6_4: CircuitInstance;  // 6-bit input, modulo 16 (2^4)

  beforeAll(async function (): Promise<void> {
    try {
      const circuitPath = path.join(
        __dirname,
        "circuits",
        "shared",
        "components",
        "mod.circom"
      );

      mod8_4 = await circom_tester.wasm(
        path.join(__dirname, "mod8_4.circom"),
        {
          include: getCircomlib(),
          compileFlags: ["--O2"],
        });

      // circuit8_3 = await circom_tester.wasm(circuitPath, {
      // include: [
      //   path.join(__dirname, "..", "node_modules"),
      //   path.join(__dirname, "..", "node_modules", "circomlib", "circuits"),
      // ],
      // compileFlags: ["--O2"],
      // });

      // circuit6_4 = await circom_tester.wasm(circuitPath, {
      // include: [
      //   path.join(__dirname, "..", "node_modules"),
      //   path.join(__dirname, "..", "node_modules", "circomlib", "circuits"),
      // ],
      //   compileFlags: ["--O2"],
      // });
    } catch (error) {
      console.error("Failed to load modulo circuit:", error);
      throw error;
    }
  }, 30000);

  describe("Basic Modulo Operations", function (): void {
    test("should calculate modulo 16 correctly", async function (): Promise<void> {
      const numbers = [0, 1, 15, 16, 17, 31, 32, 255];

      for (const input of numbers) {
        const witness = await mod8_4.calculateWitness({ in: input });

        await mod8_4.checkConstraints(witness);
        const result = witness[1]; // output signal is at index 1

        expect(result).toBe(input % 16);
      }
    });

    // test.skip("should calculate modulo 8 correctly", async function (): Promise<void> {
    //   const testCases = [
    //     { input: 0, expected: 0 },
    //     { input: 7, expected: 7 },
    //     { input: 8, expected: 0 },
    //     { input: 15, expected: 7 },
    //     { input: 16, expected: 0 },
    //     { input: 23, expected: 7 },
    //     { input: 255, expected: 7 },
    //   ];

    //   for (const testCase of testCases) {
    //     const input = { in: testCase.input };
    //     const witness = await circuit8_3.calculateWitness(input);

    //     await circuit8_3.checkConstraints(witness);
    //     const result = witness[1];

    //     expect(result).toBe(BigInt(testCase.expected));
    //     console.log(`${testCase.input} % 8 = ${result}`);
    //   }
    // });
  });

  // describe.skip("Edge Cases", function (): void {
  //   test("should handle maximum input values", async function (): Promise<void> {
  //     const testCases = [
  //       { input: 63, expected: 15 },
  //       { input: 48, expected: 0 },
  //       { input: 32, expected: 0 },
  //     ];

  //     for (const testCase of testCases) {
  //       const input = { in: testCase.input };
  //       const witness = await circuit6_4.calculateWitness(input);

  //       await circuit6_4.checkConstraints(witness);
  //       const result = witness[1];

  //       expect(result).toBe(BigInt(testCase.expected));
  //     }
  //   });
  // });

  // describe.skip("Range Validation", function (): void {
  //   test("should ensure output is always less than modulus", async function (): Promise<void> {
  //     const randomInputs = [0, 3, 7, 11, 19, 29, 37, 41, 53, 67, 89, 101, 127, 200, 255];

  //     for (const input of randomInputs) {
  //       const testInput = { in: input };
  //       const witness = await mod8_4.calculateWitness(testInput);

  //       await mod8_4.checkConstraints(witness);
  //       const result = Number(witness[1]);

  //       expect(result).toBeGreaterThanOrEqual(0);
  //       expect(result).toBeLessThan(16);

  //       expect(result).toBe(input % 16);
  //     }
  //   });
  // });

  // describe.skip("Constraint Validation", function (): void {
  //   test("should reject invalid outputs (if possible to test)", async function (): Promise<void> {
  //     // Note: This test depends on how the circuit is implemented
  //     // If the circuit has proper constraints, invalid inputs should fail

  //     // Test some edge cases that might cause issues
  //     const validInputs = [0, 1, 63]; // Valid for 6-bit circuit

  //     for (const input of validInputs) {
  //       const testInput = { in: input };
  //       const witness = await circuit6_4.calculateWitness(testInput);

  //       // Should not throw
  //       await expect(circuit6_4.checkConstraints(witness)).resolves.not.toThrow();
  //     }
  //   });
  // });
});