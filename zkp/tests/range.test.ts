import { WitnessTester } from "./util/index.js";

describe("InRange Circuit", function () {
  let circuit: WitnessTester<["in", "min", "max"], ["out"]>;

  describe("Basic 4-bit Range Validation", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/range.circom",
        "InRange",
        {
          templateParams: ["4"],
        },
      );
      circuit.setConstraint("4-bit in-range check");
    });

    it("should validate full range [0, 15]", async function (): Promise<void> {
      for (let value = 0; value <= 15; value++) {
        await circuit.expectPass({ in: value, min: 0, max: 15 }, { out: 1 });
      }
    });

    it("should validate custom range [3, 8]", async function (): Promise<void> {
      const min = 3,
        max = 8;
      for (let value = 0; value <= 15; value++) {
        await circuit.expectPass(
          { in: value, min, max },
          { out: min <= value && value <= max ? 1 : 0 },
        );
      }
    });

    it("should contraint in, min and max", async function (): Promise<void> {
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
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("Basic 8-bit Range Validation", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/range.circom",
        "InRange",
        {
          templateParams: ["8"],
        },
      );
      circuit.setConstraint("8-bit in-range check");
    });

    it("should validate full range [0, 255]", async function (): Promise<void> {
      const min = 0,
        max = 255;
      const values = [0, 1, 127, 254, 255];

      for (const value of values) {
        await circuit.expectPass({ in: value, min, max }, { out: 1 });
      }
    });

    it("should validate custom range [10, 100]", async function (): Promise<void> {
      const min = 10,
        max = 100;
      const values = [9, 10, 11, 50, 99, 100, 101];

      for (const value of values) {
        await circuit.expectPass(
          { in: value, min, max },
          { out: min <= value && value <= max ? 1 : 0 },
        );
      }
    });

    it("should handle exact boundary values correctly", async function (): Promise<void> {
      const min = 50,
        max = 200;
      const values = [49, 50, 51, 199, 200, 201];

      for (const value of values) {
        await circuit.expectPass(
          { in: value, min, max },
          { out: min <= value && value <= max ? 1 : 0 },
        );
      }
    });
  });
});
