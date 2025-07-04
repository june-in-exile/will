import { WitnessTester } from "./utils";

describe("Divide Circuit", function () {
  let circuit: WitnessTester<["dividend", "divisor"], ["quotient", "remainder"]>;

  describe("8-bit Divided by 6-bit Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct("./shared/components/arithmetic.circom", {
        templateParams: ["8", "6"],
      });
    });

    test("should calculate valid division correctly", async function (): Promise<void> {
      const testCases = [
        { dividend: 0, divisor: 1 },
        { dividend: 1, divisor: 1 },
        { dividend: 2, divisor: 1 },
        { dividend: 100, divisor: 1 },
        { dividend: 255, divisor: 1 },
        { dividend: 0, divisor: 16 },
        { dividend: 1, divisor: 16 },
        { dividend: 15, divisor: 16 },
        { dividend: 16, divisor: 16 },
        { dividend: 17, divisor: 16 },
        { dividend: 31, divisor: 16 },
        { dividend: 32, divisor: 16 },
        { dividend: 63, divisor: 16 },
        { dividend: 64, divisor: 16 },
        { dividend: 255, divisor: 16 },
        { dividend: 0, divisor: 63 },
        { dividend: 1, divisor: 63 },
        { dividend: 63, divisor: 63 },
        { dividend: 255, divisor: 63 },
      ];

      for (const testCase of testCases) {
        await circuit.expectPass(testCase, {
          quotient: BigInt(Math.floor(testCase.dividend / testCase.divisor)),
          remainder: BigInt(testCase.dividend % testCase.divisor),
        });
      }
    });

    test("should prevent division by zero", async function (): Promise<void> {
      const testCases = [
        { dividend: 0, divisor: 0 },
        { dividend: 1, divisor: 0 },
        { dividend: 15, divisor: 0 },
        { dividend: 255, divisor: 0 },
        { dividend: 256, divisor: 0 },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });

    test("should constraint dividend bits", async function (): Promise<void> {
      const testCases = [
        { dividend: 256, divisor: 0 },
        { dividend: 256, divisor: 1 },
        { dividend: 256, divisor: 63 },
        { dividend: 256, divisor: 64 },
        { dividend: 300, divisor: 1 },
        { dividend: 300, divisor: 12 },
        { dividend: 1023, divisor: 16 },
        { dividend: 1024, divisor: 63 },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });

    test("should constraint divisor bits", async function (): Promise<void> {
      const testCases = [
        { dividend: 0, divisor: 64 },
        { dividend: 1, divisor: 64 },
        { dividend: 16, divisor: 64 },
        { dividend: 63, divisor: 64 },
        { dividend: 255, divisor: 64 },
        { dividend: 256, divisor: 64 },
        { dividend: 0, divisor: 100 },
        { dividend: 1, divisor: 100 },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("12-bit Divided by 8-bit Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct("./shared/components/arithmetic.circom", {
        templateParams: ["12", "8"],
      });
    });

    test("should calculate valid division correctly", async function (): Promise<void> {
      const testCases = [
        { dividend: 0, divisor: 1 },
        { dividend: 1, divisor: 1 },
        { dividend: 4095, divisor: 1 },
        { dividend: 0, divisor: 16 },
        { dividend: 1, divisor: 16 },
        { dividend: 15, divisor: 16 },
        { dividend: 16, divisor: 16 },
        { dividend: 17, divisor: 16 },
        { dividend: 31, divisor: 16 },
        { dividend: 32, divisor: 16 },
        { dividend: 63, divisor: 16 },
        { dividend: 64, divisor: 16 },
        { dividend: 255, divisor: 16 },
        { dividend: 0, divisor: 255 },
        { dividend: 1, divisor: 255 },
        { dividend: 8, divisor: 255 },
        { dividend: 128, divisor: 255 },
        { dividend: 1024, divisor: 255 },
        { dividend: 4095, divisor: 255 },
      ];

      for (const testCase of testCases) {
        await circuit.expectPass(testCase, {
          quotient: BigInt(Math.floor(testCase.dividend / testCase.divisor)),
          remainder: BigInt(testCase.dividend % testCase.divisor),
        });
      }
    });

    test("should prevent division by zero", async function (): Promise<void> {
      const testCases = [
        { dividend: 0, divisor: 0 },
        { dividend: 1, divisor: 0 },
        { dividend: 24, divisor: 0 },
        { dividend: 120, divisor: 0 },
        { dividend: 255, divisor: 0 },
        { dividend: 1024, divisor: 0 },
        { dividend: 4095, divisor: 0 },
        { dividend: 4096, divisor: 0 },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });

    test("should constraint dividend bits", async function (): Promise<void> {
      const testCases = [
        { dividend: 4096, divisor: 0 },
        { dividend: 4096, divisor: 1 },
        { dividend: 4096, divisor: 2 },
        { dividend: 4096, divisor: 255 },
        { dividend: 4096, divisor: 256 },
        { dividend: 5000, divisor: 1 },
        { dividend: 6000, divisor: 12 },
        { dividend: 8192, divisor: 15 },
        { dividend: 8192, divisor: 255 },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });

    test("should constraint divisor bits", async function (): Promise<void> {
      const testCases = [
        { dividend: 0, divisor: 256 },
        { dividend: 1, divisor: 256 },
        { dividend: 4095, divisor: 256 },
        { dividend: 4096, divisor: 256 },
        { dividend: 0, divisor: 320 },
        { dividend: 1, divisor: 320 },
        { dividend: 63, divisor: 320 },
        { dividend: 64, divisor: 320 },
        { dividend: 255, divisor: 320 },
        { dividend: 320, divisor: 320 },
        { dividend: 1000, divisor: 320 },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});