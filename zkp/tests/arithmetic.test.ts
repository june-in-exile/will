import { WitnessTester } from "./util/index.js";

describe("Divide Circuit", function () {
  let circuit: WitnessTester<
    ["dividend", "divisor"],
    ["quotient", "remainder"]
  >;

  describe("Valid Division", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "Divide",
      );
      circuit.setConstraint("division");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should calculate 8-by-6-bit division correctly", async function (): Promise<void> {
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

    it("should calculate 12-by-8-bit division correctly", async function (): Promise<void> {
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
  });
});

describe("MultiplyTwoArray Circuit", function () {
  let circuit: WitnessTester<["a", "b"], ["c"]>;

  describe("1-Element Array Multiplication Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "MultiplyTwoArray",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("1-element array multiplication");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

  describe("3-Element Array Multiplication Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "MultiplyTwoArray",
        {
          templateParams: ["3"],
        },
      );
      circuit.setConstraint("3-element array multiplication");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

  describe("5-Element Array Multiplication Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "MultiplyTwoArray",
        {
          templateParams: ["5"],
        },
      );
      circuit.setConstraint("5-element array multiplication");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

  describe("10-Element Array Multiplication Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "MultiplyTwoArray",
        {
          templateParams: ["10"],
        },
      );
      circuit.setConstraint("10-element array multiplication");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

describe("Sum Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("3-Element Sum Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "Sum",
        {
          templateParams: ["3"],
        },
      );
      circuit.setConstraint("sum 3 elements");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should perform 3-element summation correctly", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0], _out: 0 },
        { _in: [1, 2, 3], _out: 6 },
        { _in: [10, 10, 10], _out: 30 },
        { _in: [1, 10, 100], _out: 111 },
        { _in: [123, 456, 789], _out: 1368 },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });
  });

  describe("5-Element Sum Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "Sum",
        {
          templateParams: ["5"],
        },
      );
      circuit.setConstraint("sum 5 elements");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should perform 5-element summation correctly", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0, 0, 0], _out: 0 },
        { _in: [1, 2, 3, 4, 5], _out: 15 },
        { _in: [10, 10, 10, 10, 10], _out: 50 },
        { _in: [1, 10, 100, 1000, 10000], _out: 11111 },
        { _in: [123, 456, 789, 1011, 1213], _out: 3592 },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });
  });

  describe("10-Element Sum Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "Sum",
        {
          templateParams: ["10"],
        },
      );
      circuit.setConstraint("sum 10 elements");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should perform 10-element summation correctly", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], _out: 0 },
        { _in: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], _out: 55 },
        { _in: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10], _out: 100 },
        {
          _in: [
            1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000,
            1000000000,
          ],
          _out: 1111111111,
        },
        {
          _in: [123, 456, 789, 1011, 1213, 1415, 1617, 1819, 2021, 2223],
          _out: 12687,
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });
  });
});

describe("Mod2 Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Modulo 2 Operations (Parity Check)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/arithmetic.circom",
        "Mod2",
      );
      circuit.setConstraint("modulo 2");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should correctly identify even numbers", async function (): Promise<void> {
      const numbers = [0, 2, 4, 6, 8, 10, 100, 1000];

      for (const num of numbers) {
        await circuit.expectPass({ in: num }, { out: num % 2 });
      }
    });

    it("should correctly identify odd numbers", async function (): Promise<void> {
      const numbers = [1, 3, 5, 7, 9, 11, 101, 1001];

      for (const num of numbers) {
        await circuit.expectPass({ in: num }, { out: num % 2 });
      }
    });

    it("should handle large numbers correctly", async function (): Promise<void> {
      const numbers = [
        1000000, 1000001, 9999998, 9999999, 16777216, 16777217, 33554432,
        33554433,
      ];

      for (const num of numbers) {
        await circuit.expectPass({ in: num }, { out: num % 2 });
      }
    });

    it("should handle edge cases correctly", async function (): Promise<void> {
      const numbers = [0, 1, 2, 255, 256, 65535, 65536];

      for (const num of numbers) {
        await circuit.expectPass({ in: num }, { out: num % 2 });
      }
    });
  });
});