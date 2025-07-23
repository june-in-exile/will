import { WitnessTester } from "./utils";
import { incrementCounter } from "./helpers";

describe("IncrementCounter Circuits", function () {
  let circuit: WitnessTester<["in"], ["out"]>;
  let circuitOptimized: WitnessTester<["in"], ["out"]>;

  describe("Increment Counter Circuit", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/counterIncrement.circom",
        "IncrementCounter",
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/counterIncrement.circom",
        "IncrementCounterOptimized",
      );
      circuit.setConstraint("counter increment");
      circuitOptimized.setConstraint("optimized counter increment");
    });

    it("should correctly increment last 4 bytes without carry", async function (): Promise<void> {
      const testCases = [
        [
          0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
          0x0c, 0x00, 0x00, 0x00, 0x01,
        ],
        [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
          0xff, 0x00, 0x00, 0x00, 0x00,
        ],
        [
          0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x11, 0x22, 0x33,
          0x44, 0x55, 0x66, 0x77, 0x88,
        ],
      ] as Byte16[];

      for (const testCase of testCases) {
        await circuit.expectPass(
          { in: testCase },
          { out: incrementCounter(testCase) as number[] },
        );
        await circuitOptimized.expectPass(
          { in: testCase },
          { out: incrementCounter(testCase) as number[] },
        );
      }
    });

    it("should handle carry propagation while preserving first 12 bytes unchanged", async function (): Promise<void> {
      const testCases = [
        [
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0xff,
        ],
        [
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0xff, 0xff,
        ],
        [
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0xff, 0xff, 0xff,
        ],
        [
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0xff, 0xff, 0xff, 0xff,
        ],
      ] as Byte16[];

      for (const testCase of testCases) {
        await circuit.expectPass(
          { in: testCase },
          { out: incrementCounter(testCase) as number[] },
        );
        await circuitOptimized.expectPass(
          { in: testCase },
          { out: incrementCounter(testCase) as number[] },
        );
      }
    });
  });
});
