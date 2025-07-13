import { WitnessTester, byteToWord } from "./utils";
import { AESUtils, addRoundKey } from "./helpers";

describe("AddRoundKey Circuit", function () {
    let circuit: WitnessTester<["state", "roundKey"], ["out"]>;

    describe("AddRoundKey Transformation", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/aes256gcm/roundKeyAddition.circom",
                "AddRoundKey",
            );
            console.info(
                "AddRoundKey circuit constraints:",
                await circuit.getConstraintCount(),
            );
        });

        it("should correctly XOR state with round key", async function (): Promise<void> {
            for (let i = 0; i < 3; i++) {
                const state = Array.from(AESUtils.randomBytes(16));
                const roundKey = Array.from(AESUtils.randomBytes(16)) as Byte[]
                const roundKeyWords = byteToWord(roundKey);

                await circuit.expectPass(
                    { state, roundKey },
                    addRoundKey(state as Byte16, roundKeyWords as Word4)
                );
            }
        });
    });
});