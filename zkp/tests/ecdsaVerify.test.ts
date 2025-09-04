import { WitnessTester } from "./util/index.js";
import { ECDSA, ECDSAUtils } from "./logic/index.js";
import { concatBigInts, splitBigInt, pubkeyToPoint, pointToPubkey } from "./logic/ecdsaVerify.js";

describe("EcdsaVerify Circuit", function () {
    let circuit: WitnessTester<["r", "s", "msghash", "pubkey"], ["result"]>;

    describe("256-Bit Message Hash Signature Verification", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/ecdsaVerify.circom",
                "EcdsaVerify",
                {
                    templateParams: ["64", "4"],
                },
            );
            circuit.setConstraint("256-bit message hash signature verification");
        });

        it("should verify fixed signature correctly", async function (): Promise<void> {
            const r = [
                BigInt("11878389131962663075"),
                BigInt("9922462056030557342"),
                BigInt("6756396965793543634"),
                BigInt("12446269625364732260"),
            ];

            const s = [
                BigInt("18433728439776304144"),
                BigInt("9948993517021512060"),
                BigInt("8616204783675899344"),
                BigInt("12630110559440107129"),
            ];

            const msghash = [
                BigInt("7828219513492386041"),
                BigInt("3988479630986735061"),
                BigInt("17828618373474417767"),
                BigInt("7725776341465200115"),
            ];

            const pubkey = [
                [
                    BigInt("15936664623177566288"),
                    BigInt("3250397285527463885"),
                    BigInt("12867682233480762946"),
                    BigInt("7876377878669208042"),
                ],
                [
                    BigInt("17119974326854866418"),
                    BigInt("4804456518640350784"),
                    BigInt("12443422089272457229"),
                    BigInt("9048921188902050084"),
                ],
            ];

            const result = ECDSA.verify(
                concatBigInts(msghash),
                {
                    r: concatBigInts(r),
                    s: concatBigInts(s),
                },
                pubkeyToPoint(pubkey),
            )
                ? 1
                : 0;
            console.log(`expected: ${result}`);

            await circuit.expectPass({ r, s, msghash, pubkey }, { result });
        });

        it("should verify random signature correctly", async function (): Promise<void> {
            const keyPair = ECDSA.generateKeyPair();
            const pubkey = pointToPubkey(keyPair.publicKey);

            const message = "Hello, ECDSA!";
            const messageHash = ECDSAUtils.hashMessage(message);
            const msghash = splitBigInt(messageHash);
            console.log(`msghash: ${msghash}`)

            const signature = ECDSA.sign(messageHash, keyPair.privateKey);
            const r = splitBigInt(signature.r);
            const s = splitBigInt(signature.s);

            const result = ECDSA.verify(messageHash, signature, keyPair.publicKey)
                ? 1
                : 0;

            console.log(`expected: ${result}`);

            await circuit.expectPass({ r, s, msghash, pubkey }, { result });
        });
    });
});
