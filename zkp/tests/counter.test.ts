import { Byte, Byte12, Byte16 } from "./type/index.js";
import { WitnessTester } from "./util/index.js";
import {
  AESUtils,
  computeJ0Standard,
  computeJ0NonStandard,
  incrementCounter,
} from "./logic/index.js";

describe("ComputeJ0Standard Circuits", function () {
  describe("Compute J0 Standard Circuit", function () {
    let circuit: WitnessTester<["iv"], ["j0"]>;

    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/counter.circom",
        "ComputeJ0Standard",
      );
      circuit.setConstraint("j0 computation for standard IV (12 bytes)");
    });

    it("should correctly compute J0 for 12-byte IV", async function (): Promise<void> {
      const testCases = [
        new Array(12).fill(0x00),
        new Array(12).fill(0xff),
        [
          0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
          0x0c,
        ],
      ] as Byte12[];

      for (const iv of testCases) {
        await circuit.expectPass({ iv: iv }, { j0: computeJ0Standard(iv) });
      }
    });

    it("should handle random 12-byte IVs", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const iv = Array.from(AESUtils.randomBytes(12)) as Byte12;

        await circuit.expectPass({ iv }, { j0: computeJ0Standard(iv) });
      }
    });
  });
});

describe("ComputeJ0NonStandard Circuit", function () {
  let circuit: WitnessTester<["iv", "hashKey"], ["j0"]>;

  it("should reject 0-byte IV input", async function (): Promise<void> {
    await expect(
      WitnessTester.construct(
        "circuits/shared/components/aesGcm/counter.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["0"],
        },
      ),
    ).rejects.toThrow();
  });

  it("should reject 12-byte IV input", async function (): Promise<void> {
    await expect(
      WitnessTester.construct(
        "circuits/shared/components/aesGcm/counter.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["12"],
        },
      ),
    ).rejects.toThrow();
  });

  describe("Compute J0 Non-Standard (16-Byte IV) Circuit", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/counter.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["16"],
        },
      );
      circuit.setConstraint("j0 computation for 16-byte IV");
    });

    it("should correctly compute J0 for 16-byte IV", async function (): Promise<void> {
      const testCases = [
        {
          iv: new Array(16).fill(0x00),
          hashKey: Array.from(AESUtils.randomBytes(16)),
        },
        {
          iv: Array.from({ length: 16 }, (_, i) => i),
          hashKey: [
            0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b, 0x88, 0x4c, 0xfa,
            0x59, 0xca, 0x34, 0x2b, 0x2e,
          ],
        },
        {
          iv: new Array(16).fill(0xff),
          hashKey: new Array(16).fill(0x55),
        },
      ] as { iv: Byte[]; hashKey: Byte16 }[];

      for (const { iv, hashKey } of testCases) {
        await circuit.expectPass(
          { iv, hashKey },
          { j0: computeJ0NonStandard(iv, hashKey) },
        );
      }
    });
  });

  describe("Varaible IV Lengths (Except for 12-Byte)", function () {
    it("should correctly compute J0 for different IV lengths", async function (): Promise<void> {
      const ivLengths = [1, 4, 7, 8, 15, 31, 32];

      for (const length of ivLengths) {
        const circuit = await WitnessTester.construct(
          "circuits/shared/components/aesGcm/counter.circom",
          "ComputeJ0NonStandard",
          {
            templateParams: [String(length)],
          },
        );
        circuit.setConstraint(`j0 computation for ${length}-byte IV`);

        for (let i = 0; i < 3; i++) {
          const iv = Array.from(AESUtils.randomBytes(length)) as Byte[];
          const hashKey = Array.from(AESUtils.randomBytes(16)) as Byte16;

          await circuit.expectPass(
            { iv, hashKey },
            { j0: computeJ0NonStandard(iv, hashKey) },
          );
        }
      }
    });
  });
});

describe("IncrementCounter Circuits", function () {
  let circuit: WitnessTester<["in"], ["out"]>;
  let circuitOptimized: WitnessTester<["in"], ["out"]>;

  describe("Increment Counter Circuit", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/counter.circom",
        "IncrementCounter",
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/counter.circom",
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
