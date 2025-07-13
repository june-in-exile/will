import { WitnessTester } from "./utils";
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
                const roundKey = Array.from(AESUtils.randomBytes(16));

                const roundKeyWords = [];
                for (let j = 0; j < 4; j++) {
                    roundKeyWords.push({
                        bytes: roundKey.slice(j * 4, (j + 1) * 4)
                    });
                }

                const expectedOut = addRoundKey(state as Byte16, roundKeyWords as Word4);

                await circuit.expectPass(
                    { state: state, roundKey: roundKey },
                    { out: expectedOut }
                );
            }
        });
    });
});