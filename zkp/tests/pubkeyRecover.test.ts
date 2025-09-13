import {
    WitnessTester,
    byteToBit,
    hexToByte,
    splitBigInt,
} from "./util/index.js";
import { recoverPublicKey } from "./logic/index.js";
import { EcdsaSignature } from "./type/index.js";

describe("RecoverEcdsaPubkey Circuit", { timeout: 300_000 }, function () {
    let circuit: WitnessTester<["signature", "msghash"], ["pubkey"]>;

    describe("Public Key Recovery from Hash and Signature", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/permitVerify/pubkeyRecover.circom",
                "RecoverEcdsaPubkey",
                {
                    templateParams: ["64", "4"],
                },
            );
            circuit.setConstraint("recover public key from hash and signature");
        });

        afterAll(async function (): Promise<void> {
            if (circuit) {
                await circuit.release();
            }
        });

        it("should recover the correct public key from hash and signature and verify its validity", async function (): Promise<void> {
            const signature: EcdsaSignature = {
                r: splitBigInt(61320857676114964215011206860082363943382150288464079385053365955570904757666n),
                s: splitBigInt(3669204771806074039460563094225368662622142448155643933869652073552707766406n),
                v: 28,
            }
            const msghash = byteToBit(hexToByte("0x5f562a366837e7590339b67641062f1de6e49f2c03acdbfe0a59739063c94069"));
            const pubkey = recoverPublicKey(signature, msghash);
            // console.debug("pubkey:", pubkey);
            // pubkey: [
            //     [
            //         16112729477231238493n,
            //         1263491400844624069n,
            //         9397608230358965727n,
            //         13022681780633155002n
            //     ],
            //     [
            //         5088976469350123869n,
            //         14288148230842228320n,
            //         1974812706588861334n,
            //         6651912937076820324n
            //     ]
            // ]

            await circuit.expectPass(
                {
                    signature, msghash
                },
                { pubkey },
            );
        });
    });
});