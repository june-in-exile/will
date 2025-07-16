import { WitnessTester } from "./utils";
import { AESUtils, AESGCM } from "./helpers";

describe("ComputeJ0Standard Circuits", function () {
  describe("Compute J0 Standard Circuit", function () {
    let circuit: WitnessTester<["iv"], ["j0"]>;

    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256ctr/j0Computation.circom",
        "ComputeJ0Standard",
      );
      console.info(
        "12-byte-IV j0 computation circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should correctly compute J0 for 12-byte IV", async function (): Promise<void> {
      const testCases = [
        {
          iv: new Array(12).fill(0x00),
          j0: [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01,
          ],
        },
        {
          iv: [
            0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
            0x0c,
          ],
          j0: [
            0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
            0x0c, 0x00, 0x00, 0x00, 0x01,
          ],
        },
        {
          iv: new Array(12).fill(0xff),
          j0: [
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0x00, 0x00, 0x00, 0x01,
          ],
        },
      ];

      for (const { iv, j0 } of testCases) {
        await circuit.expectPass({ iv }, { j0 });
      }
    });

    it("should handle random 12-byte IVs", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const iv = Array.from(AESUtils.randomBytes(12));
        const j0 = [...iv, 0x00, 0x00, 0x00, 0x01];

        await circuit.expectPass({ iv }, { j0 });
      }
    });
  });
});

describe("ComputeJ0NonStandard Circuit", function () {
  let circuit: WitnessTester<["iv", "hashKey"], ["j0"]>;

  it("should reject 0-byte IV input", async function (): Promise<void> {
    await expect(
      WitnessTester.construct(
        "circuits/shared/components/aes256ctr/j0Computation.circom",
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
        "circuits/shared/components/aes256ctr/j0Computation.circom",
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
        "circuits/shared/components/aes256ctr/j0Computation.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["8"],
        },
      );
      console.info(
        "8-byte-IV j0 computation circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should correctly compute J0 for 8-byte IV", async function (): Promise<void> {
      const iv = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08];
      const hashKey = Array.from(AESUtils.randomBytes(16));

      // Compute expected J0 using TypeScript implementation
      const j0 = Array.from(
        AESGCM.computeJ0(Buffer.from(iv), Buffer.from(hashKey)),
      );

      await circuit.expectPass({ iv, hashKey }, { j0 });
    });
  });

  describe("16-Byte-IV Compute J0 Non-Standard Circuit", function () {
    let circuit: WitnessTester<["iv", "hashKey"], ["j0"]>;

    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256ctr/j0Computation.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["16"],
        },
      );
      console.info(
        "16-byte-IV j0 computation circuit constraints:",
        await circuit.getConstraintCount(),
      );
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
      ];

      for (const { iv, hashKey } of testCases) {
        const j0 = Array.from(
          AESGCM.computeJ0(Buffer.from(iv), Buffer.from(hashKey)),
        );

        await circuit.expectPass({ iv, hashKey }, { j0 });
      }
    });
  });

  describe("1-to-32-byte IV Lengths (Except for 12-Byte)", function () {
    it("should correctly compute J0 for different IV lengths", async function (): Promise<void> {
      const ivLengths = [1, 4, 7, 8, 13, 15, 16, 31, 32, 63, 64];

      for (const length of ivLengths) {
        const circuit = await WitnessTester.construct(
          "circuits/shared/components/aes256ctr/j0Computation.circom",
          "ComputeJ0NonStandard",
          {
            templateParams: [String(length)],
          },
        );
        console.info(
          `${length}-byte-IV j0 computation circuit constraints:`,
          await circuit.getConstraintCount(),
        );

        for (let i = 0; i < 3; i++) {
          const iv = Array.from(AESUtils.randomBytes(length));
          const hashKey = Array.from(AESUtils.randomBytes(16));

          const j0 = Array.from(
            AESGCM.computeJ0(Buffer.from(iv), Buffer.from(hashKey)),
          );

          await circuit.expectPass({ iv, hashKey }, { j0 });
        }
      }
    });
  });
});
