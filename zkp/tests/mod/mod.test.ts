import { getCircomlib } from "../utils";
import path from "path";
const circom_tester = require("circom_tester");
import type { CircuitInstance } from "circom_tester";


describe("Modulo Circuit", function () {
  let mod8: CircuitInstance;  // 8-bit input
  let mod6: CircuitInstance;  // 6-bit input

  beforeAll(async function (): Promise<void> {
    try {
      mod8 = await circom_tester.wasm(
        path.join(__dirname, "mod8.circom"),
        {
          include: getCircomlib(),
          compileFlags: ["--O2", "--inspect"],
        });

      mod6 = await circom_tester.wasm(
        path.join(__dirname, "mod6.circom"),
        {
          include: getCircomlib(),
          compileFlags: ["--O2", "--inspect"],
        });
    } catch (error) {
      console.error("Failed to load modulo circuit:", error);
      throw error;
    }
  }, 30000);

  describe("8-bit Modulo Operations", function (): void {
    test("should calculate valid modulus correctly", async function (): Promise<void> {
      const testCases = [
        { in: 0, modulus: 16 },
        { in: 1, modulus: 16 },
        { in: 15, modulus: 16 },
        { in: 16, modulus: 16 },
        { in: 17, modulus: 16 },
        { in: 31, modulus: 16 },
        { in: 32, modulus: 16 },
        { in: 255, modulus: 16 },
        { in: 0, modulus: 3 },
        { in: 8, modulus: 9 },
        { in: 11, modulus: 11 },
        { in: 7, modulus: 12 },
        { in: 13, modulus: 32 },
        { in: 13, modulus: 33 },
        { in: 32, modulus: 37 },
        { in: 28, modulus: 109 },
        { in: 1, modulus: 255 },
        { in: 255, modulus: 255 },
        { in: 256, modulus: 255 },
        { in: 1024, modulus: 255 },
      ]

      for (const testCase of testCases) {
        const witness = await mod8.calculateWitness(testCase);

        await mod8.checkConstraints(witness);
        const quotient = witness[1];
        const remainder = witness[2];

        expect(quotient).toBe(BigInt(Math.floor(testCase.in / testCase.modulus)));
        expect(remainder).toBe(BigInt(testCase.in % testCase.modulus));
      }
    });

    test("should reject invalid modulus", async function (): Promise<void> {
      const testCases = [
        { in: 0, modulus: 256 },
        { in: 1, modulus: 256 },
        { in: 191, modulus: 256 },
        { in: 192, modulus: 256 },
        { in: 255, modulus: 256 },
        { in: 256, modulus: 256 },
        { in: 257, modulus: 256 },
        { in: 1024, modulus: 256 },
        { in: 0, modulus: 300 },
        { in: 1, modulus: 300 },
      ];

      for (const testCase of testCases) {
        const input = { in: testCase.in, modulus: testCase.modulus };
        await expect(mod6.calculateWitness(input)).rejects.toThrow();
      }
    });
  });

  describe("6-bit Modulo Operations", function (): void {
    test("should calculate valid modulus correctly", async function (): Promise<void> {
      const testCases = [
        { in: 0, modulus: 16 },
        { in: 1, modulus: 16 },
        { in: 15, modulus: 16 },
        { in: 16, modulus: 16 },
        { in: 17, modulus: 16 },
        { in: 31, modulus: 16 },
        { in: 32, modulus: 16 },
        { in: 255, modulus: 16 },
        { in: 0, modulus: 3 },
        { in: 8, modulus: 9 },
        { in: 11, modulus: 11 },
        { in: 7, modulus: 12 },
        { in: 13, modulus: 32 },
        { in: 13, modulus: 33 },
        { in: 32, modulus: 37 },
        { in: 1, modulus: 63 },
        { in: 62, modulus: 63 },
        { in: 63, modulus: 63 },
        { in: 64, modulus: 63 },
        { in: 300, modulus: 63 },
      ]

      for (const testCase of testCases) {
        const witness = await mod8.calculateWitness(testCase);

        await mod8.checkConstraints(witness);
        const quotient = witness[1];
        const remainder = witness[2];

        expect(quotient).toBe(BigInt(Math.floor(testCase.in / testCase.modulus)));
        expect(remainder).toBe(BigInt(testCase.in % testCase.modulus));
      }
    });

    test("should reject invalid modulus", async function (): Promise<void> {
      const testCases = [
        { in: 0, modulus: 64 },
        { in: 1, modulus: 64 },
        { in: 16, modulus: 64 },
        { in: 63, modulus: 64 },
        { in: 64, modulus: 64 },
        { in: 65, modulus: 64 },
        { in: 0, modulus: 100 },
        { in: 1, modulus: 100 },
      ];

      for (const testCase of testCases) {
        await expect(mod6.calculateWitness(testCase)).rejects.toThrow();
      }
    });
  });
});