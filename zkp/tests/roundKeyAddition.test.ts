import { Byte, Byte16, Word4 } from "./type/index.js";
import { WitnessTester, byteToWord } from "./util/index.js";
import { AESUtils, addRoundKey } from "./logic/index.js";

describe("AddRoundKey Circuit", function () {
  let circuit: WitnessTester<["state", "roundKey"], ["out"]>;

  describe("AddRoundKey Transformation", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/roundKeyAddition.circom",
        "AddRoundKey",
      );
      circuit.setConstraint("round key addition");
    });

    it("should correctly XOR state with round key", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const state = Array.from(AESUtils.randomBytes(16));
        const roundKey = Array.from(AESUtils.randomBytes(16)) as Byte[];
        const roundKeyWords = byteToWord(roundKey);

        await circuit.expectPass(
          { state, roundKey },
          addRoundKey(state as Byte16, roundKeyWords as Word4),
        );
      }
    });
  });
});
