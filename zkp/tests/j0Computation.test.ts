import { WitnessTester } from "./utils";
import { AESUtils, computeJ0Standard, computeJ0NonStandard } from "./helpers";

describe("ComputeJ0Standard Circuits", function () {
  describe("Compute J0 Standard Circuit", function () {
    let circuit: WitnessTester<["iv"], ["j0"]>;

    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/j0Computation.circom",
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
        "circuits/shared/components/aes-gcm/j0Computation.circom",
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
        "circuits/shared/components/aes-gcm/j0Computation.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["12"],
        },
      ),
    ).rejects.toThrow();
  });

  describe("8-Byte-IV Compute J0 Non-Standard Circuit", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/j0Computation.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["8"],
        },
      );
      circuit.setConstraint("j0 computation for 8-byte IV");
    });

    it("should correctly compute J0 for 8-byte IV", async function (): Promise<void> {
      const iv = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08] as Byte[];
      const hashKey = Array.from(AESUtils.randomBytes(16)) as Byte16;

      await circuit.expectPass(
        { iv, hashKey },
        { j0: computeJ0NonStandard(iv, hashKey) },
      );
    });
  });

  describe("16-Byte-IV Compute J0 Non-Standard Circuit", function () {
    let circuit: WitnessTester<["iv", "hashKey"], ["j0"]>;

    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/j0Computation.circom",
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

  describe("1-to-32-byte IV Lengths (Except for 12-Byte)", function () {
    it("should correctly compute J0 for different IV lengths", async function (): Promise<void> {
      const ivLengths = [1, 4, 7, 8, 13, 15, 16, 31, 32, 63, 64];

      for (const length of ivLengths) {
        const circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/j0Computation.circom",
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
