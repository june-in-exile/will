import { WitnessTester } from "./utils";

describe("Divide Circuit", function () {
  let circuit: WitnessTester<
    ["dividend", "divisor"],
    ["quotient", "remainder"]
  >;

  describe("8-bit Divided by 6-bit Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "Divide",
        {
          templateParams: ["8", "6"],
        },
      );
      circuit.recordConstraint("8-by-6-bit division");
    });

    it("should calculate valid division correctly", async function (): Promise<void> {
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

      for (const { dividend, divisor } of testCases) {
        await circuit.expectPass(
          { dividend, divisor },
          {
            quotient: BigInt(Math.floor(dividend / divisor)),
            remainder: BigInt(dividend % divisor),
          },
        );
      }
    });

    it("should prevent division by zero", async function (): Promise<void> {
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

    it("should constraint dividend bits", async function (): Promise<void> {
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

    it("should constraint divisor bits", async function (): Promise<void> {
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
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "Divide",
        {
          templateParams: ["12", "8"],
        },
      );
      circuit.recordConstraint("12-by-8-bit division");
    });

    it("should calculate valid division correctly", async function (): Promise<void> {
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

      for (const { dividend, divisor } of testCases) {
        await circuit.expectPass(
          { dividend, divisor },
          {
            quotient: BigInt(Math.floor(dividend / divisor)),
            remainder: BigInt(dividend % divisor),
          },
        );
      }
    });

    it("should prevent division by zero", async function (): Promise<void> {
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

    it("should constraint dividend bits", async function (): Promise<void> {
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

    it("should constraint divisor bits", async function (): Promise<void> {
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

describe("MultiplyArray Circuit", function () {
  let circuit: WitnessTester<["a", "b"], ["c"]>;

  describe("1-bit Array Multiplication Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "MultiplyArray",
        {
          templateParams: ["1"],
        },
      );
      circuit.recordConstraint("1-bit array multiplication");
    });

    it("should perform element-wise multiplication correctly", async function (): Promise<void> {
      const testCases = [
        { a: [0], b: [0], c: [0] },
        { a: [1], b: [1], c: [1] },
        { a: [2], b: [3], c: [6] },
        { a: [5], b: [7], c: [35] },
        { a: [10], b: [0], c: [0] },
        { a: [0], b: [100], c: [0] },
        { a: [12], b: [12], c: [144] },
      ];

      for (const { a, b, c } of testCases) {
        await circuit.expectPass({ a, b }, { c });
      }
    });

    it("should handle large numbers correctly", async function (): Promise<void> {
      const testCases = [
        {
          a: [1000],
          b: [1000],
          c: [1000000],
        },
        {
          a: [500],
          b: [2000],
          c: [1000000],
        },
        {
          a: [12345],
          b: [6789],
          c: [83810205],
        },
      ];

      for (const { a, b, c } of testCases) {
        await circuit.expectPass({ a, b }, { c });
      }
    });
  });

  describe("3-bit Array Multiplication Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "MultiplyArray",
        {
          templateParams: ["3"],
        },
      );
      circuit.recordConstraint("3-bit array multiplication");
    });

    it("should perform element-wise multiplication correctly", async function (): Promise<void> {
      const testCases = [
        { a: [0, 0, 0], b: [0, 0, 0], c: [0, 0, 0] },
        { a: [1, 1, 1], b: [1, 1, 1], c: [1, 1, 1] },
        { a: [1, 2, 3], b: [4, 5, 6], c: [4, 10, 18] },
        { a: [2, 4, 6], b: [1, 3, 5], c: [2, 12, 30] },
        { a: [10, 20, 30], b: [2, 3, 4], c: [20, 60, 120] },
        { a: [0, 5, 0], b: [10, 0, 15], c: [0, 0, 0] },
      ];

      for (const { a, b, c } of testCases) {
        await circuit.expectPass({ a, b }, { c });
      }
    });

    it("should handle large numbers correctly", async function (): Promise<void> {
      const testCases = [
        {
          a: [100, 200, 300],
          b: [50, 25, 10],
          c: [5000, 5000, 3000],
        },
        {
          a: [1000, 2000, 3000],
          b: [5, 10, 15],
          c: [5000, 20000, 45000],
        },
        {
          a: [999, 888, 777],
          b: [2, 3, 4],
          c: [1998, 2664, 3108],
        },
      ];

      for (const { a, b, c } of testCases) {
        await circuit.expectPass({ a, b }, { c });
      }
    });
  });

  describe("5-bit Array Multiplication Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "MultiplyArray",
        {
          templateParams: ["5"],
        },
      );
      circuit.recordConstraint("5-bit array multiplication");
    });

    it("should perform element-wise multiplication correctly", async function (): Promise<void> {
      const testCases = [
        {
          a: [1, 2, 3, 4, 5],
          b: [2, 3, 4, 5, 6],
          c: [2, 6, 12, 20, 30],
        },
        {
          a: [10, 0, 5, 8, 3],
          b: [2, 7, 4, 0, 9],
          c: [20, 0, 20, 0, 27],
        },
        {
          a: [1, 1, 1, 1, 1],
          b: [7, 8, 9, 10, 11],
          c: [7, 8, 9, 10, 11],
        },
        {
          a: [0, 0, 0, 0, 0],
          b: [1, 2, 3, 4, 5],
          c: [0, 0, 0, 0, 0],
        },
      ];

      for (const { a, b, c } of testCases) {
        await circuit.expectPass({ a, b }, { c });
      }
    });
  });

  describe("10-bit Array Multiplication Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "MultiplyArray",
        {
          templateParams: ["10"],
        },
      );
      circuit.recordConstraint("10-bit array multiplication");
    });

    it("should perform element-wise multiplication correctly", async function (): Promise<void> {
      const testCases = [
        {
          a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          b: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          c: [10, 18, 24, 28, 30, 30, 28, 24, 18, 10],
        },
        {
          a: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
          b: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          c: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        },
        {
          a: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
          b: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
          c: [0, 5, 0, 5, 0, 5, 0, 5, 0, 5],
        },
      ];

      for (const { a, b, c } of testCases) {
        await circuit.expectPass({ a, b }, { c });
      }
    });
  });
});
