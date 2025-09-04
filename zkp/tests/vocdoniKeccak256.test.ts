import { WitnessTester } from "./util/index.js";
import { Keccak256Utils, vocdoniKeccak256 } from "./logic/index.js";
import { Bit } from "./type/index.js";

describe("VocdoniKeccak256 Circuit", function () {
    let circuit: WitnessTester<["msg"], ["digest"]>;

    /*
     * @note 1 block is 1088 bits / 8 = 136 bytes
     */
    describe("Hash 256 bits", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/keccak256/vocdoniKeccak256.circom",
                "VocdoniKeccak256",
                {
                    templateParams: ["256", "256"],
                },
            );
            circuit.setConstraint("256-bit (32-byte) massage (less than one block)");
        });

        it("should calculate the correct hash", async function (): Promise<void> {
            const randomBytes = crypto.getRandomValues(new Uint8Array(32));
            const msg = Keccak256Utils.bytesToBits(randomBytes) as Bit[];

            const digest = vocdoniKeccak256(msg);

            await circuit.expectPass({ msg }, { digest });
        });
    });

    describe.skip("Hash 1360 bits", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/keccak256/vocdoniKeccak256.circom",
                "VocdoniKeccak",
                {
                    templateParams: ["1360", "256"],
                },
            );
            circuit.setConstraint("1360-bit (170-byte) massage (less than one block)");
        });

        it("should calculate the correct hash", async function (): Promise<void> {
            const randomBytes = crypto.getRandomValues(new Uint8Array(170));
            const msg = Keccak256Utils.bytesToBits(randomBytes) as Bit[];

            const digest = vocdoniKeccak256(msg);

            await circuit.expectPass({ msg }, { digest });
        });
    });
});
