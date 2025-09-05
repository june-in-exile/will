import { WitnessTester, splitBigInt, pointToBigInts } from "./util/index.js";
import { Point } from "./type/index.js";
import { ECDSA, ECDSAUtils } from "./logic/index.js";
import { ecdsaPrivToPub, ecdsaVerifyNoPubkeyCheck } from "./logic/ecdsa.js";

describe("Dummy Point", function () {
    it("should calculate correct 2**255*G", async function (): Promise<void> {
        const G: Point = {
            x: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
            y: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n,
            isInfinity: false
        };
        let result = G;

        // 重複點倍增 255 次: G -> 2G -> 4G -> 8G -> ... -> 2^255 * G
        for (let i = 0; i < 255; i++) {
            result = ECDSAUtils.pointDouble(result);
        }

        console.log("Dummy Point:", result);
        // Dummy Point: {
        //     x: 80609861913912564376813326121470687649554127203741395941834419933864230904708n,
        //     y: 114172617133077519546499241751011876596863476376685168252563264143225481955342n,
        //     isInfinity: false
        // }
        const x = splitBigInt(result.x);
        const y = splitBigInt(result.y);
        console.log(x);
        console.log(y);
    });
});

describe.only("ECDSAPrivToPub Circuit", function () {
    let circuit: WitnessTester<["privkey"], ["pubkey"]>;

    describe("ECDSA Private Key to Public Key", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/ecdsa.circom",
                "ECDSAPrivToPub",
                {
                    templateParams: ["64", "4"],
                },
            );
            circuit.setConstraint("calculate ecdsa public key from private key");
        });

        it("should calculate the correct public key", async function (): Promise<void> {
            const keyPair = ECDSA.generateKeyPair();
            const privkey = splitBigInt(keyPair.privateKey);
            const pubkey = ecdsaPrivToPub(privkey);

            await circuit.expectPass({ privkey }, { pubkey });
        });
    });
});

describe.skip("ECDSAVerifyNoPubkeyCheck Circuit", function () {
    let circuit: WitnessTester<["r", "s", "msghash", "pubkey"], ["result"]>;

    describe("256-Bit Message Hash Signature Verification Without Checking Public Key", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/ecdsa.circom",
                "ECDSAVerifyNoPubkeyCheck",
                {
                    templateParams: ["64", "4"],
                },
            );
            circuit.setConstraint("256-bit message hash signature verification w/o checking public key");
        });

        it.only("should verify fixed signature correctly", async function (): Promise<void> {
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

            // const result = ecdsaVerifyNoPubkeyCheck(r, s, msghash, pubkey);

            await circuit.expectPass({ r, s, msghash, pubkey }, { result: 1 });
        });

        it("should verify random signature correctly", async function (): Promise<void> {
            const message = "Hello, ECDSA!";
            const messageHash = ECDSAUtils.hashMessage(message);
            const msghash = splitBigInt(messageHash);

            const keyPair = ECDSA.generateKeyPair();
            const pubkey = pointToBigInts(keyPair.publicKey);

            const signature = ECDSA.sign(messageHash, keyPair.privateKey);
            const r = splitBigInt(signature.r);
            const s = splitBigInt(signature.s);

            const result = ecdsaVerifyNoPubkeyCheck(r, s, msghash, pubkey);

            await circuit.expectPass({ r, s, msghash, pubkey }, { result });
        });
    });
});
