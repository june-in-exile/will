import { expandKey } from "./helpers";
import { WitnessTester } from "./utils";

describe("ExpandKey Circuit", function () {
  let circuit: WitnessTester<["key"], ["expandedKey"]>;

  describe("Key Expansion for AES-256", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/keyExpansion.circom",
        "ExpandKey",
        {
          templateParams: ["256"],
        },
      );
      console.info(
        "Key expansion circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should expand 32-byte key to 240-byte correctly", async function (): Promise<void> {
      const key = [
        0xaa, 0x6a, 0x44, 0x59, 0x14, 0x10, 0xfb, 0x0d, 0x61, 0xa7, 0xac, 0x45,
        0x62, 0x4a, 0x17, 0x15, 0x41, 0xd9, 0x03, 0xc3, 0xac, 0xef, 0x55, 0xd3,
        0x5b, 0x10, 0xd9, 0x21, 0xd3, 0x40, 0x4b, 0xba,
      ];

      const keyBytes: Word[] = [];
      for (let i = 0; i < key.length; i += 4) {
        keyBytes.push({
          bytes: key.slice(i, i + 4) as [Byte, Byte, Byte, Byte],
        });
      }

      await circuit.expectPass({ key }, { expandedKey: expandKey(keyBytes) });
    });
  });
});
