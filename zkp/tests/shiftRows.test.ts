import { AESUtils, shiftRows } from "./helpers";
import { WitnessTester } from "./utils";

describe.only("ShiftRows Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Row Shifting for Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/shiftRows.circom",
        "shiftRows",
      );
      console.info(
        "ShiftRows circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should shift rows according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const bytes = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass(
          { in: bytes },
          { out: shiftRows(bytes) },
        );
      }
    });

    it("should handle test vectors in column-major", async function (): Promise<void> {
      await circuit.expectPass(
        {
          in: [
            0x00, 0x01, 0x02, 0x03,
            0x10, 0x11, 0x12, 0x13,
            0x20, 0x21, 0x22, 0x23,
            0x30, 0x31, 0x32, 0x33
          ]
        },
        {
          out: [
            0x00, 0x11, 0x22, 0x33,
            0x10, 0x21, 0x32, 0x03,
            0x20, 0x31, 0x02, 0x13,
            0x30, 0x01, 0x12, 0x23
          ]
        },
      );
    });
  });
});