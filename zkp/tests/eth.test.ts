import { WitnessTester, ecdsaPointToBigInts } from "./util/index.js";
import { Bit, EcdsaPoint, ConcatedEcdsaPoint } from "./type/index.js";
import { flattenPubkey, pubkeyToAddress } from "./logic/index.js";

describe("FlattenPubkey Circuit", function () {
    let circuit: WitnessTester<["chunkedPubkey"], ["pubkeyBits"]>;

    describe("Flatten Public Key", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/eth.circom",
                "FlattenPubkey",
                {
                    templateParams: ["64", "4"],
                },
            );
            circuit.setConstraint(
                "flatten public key in the foramt of 2 4*64-bit registers",
            );
        });

        afterAll(async function (): Promise<void> {
            if (circuit) {
                await circuit.release();
            }
        });

        it("should flatten the public key (or any ECDSA point) correctly", async function (): Promise<void> {
            const testCases: ConcatedEcdsaPoint[] = [
                {
                    x: BigInt(
                        "0x0000000000000000000000000000000000000000000000000000000000000001",
                    ),
                    y: BigInt(
                        "0x8000000000000000000000000000000000000000000000000000000000000000",
                    ),
                    isInfinity: false,
                },
                {
                    x: BigInt(
                        "0x0000000010000000200000003000000040000000500000006000000070000000",
                    ),
                    y: BigInt(
                        "0x8000000090000000a0000000b0000000c0000000d0000000e0000000f0000000",
                    ),
                    isInfinity: false,
                },
                {
                    x: BigInt(
                        "0x8d4a7f1c5e9b2a6f3d8c4e7b1f5a9d3c6e2b8df4a7d1c5e9b2a6f3d8c4e7b1f5",
                    ),
                    y: BigInt(
                        "0xb9f3c7a1e5d8c2f6b4a9e3d7c1f5b8a2e6d9c3f7b1a5e8d4c2f6b9a3e7d1c5f8",
                    ),
                    isInfinity: false,
                },
            ];

            for (const testCase of testCases) {
                const chunkedPubkey = ecdsaPointToBigInts(testCase);
                const pubkeyBits = flattenPubkey(chunkedPubkey);
                await circuit.expectPass({ chunkedPubkey }, { pubkeyBits });
            }
        });
    });
});

describe("PubkeyToAddress Circuit", function () {
    let circuit: WitnessTester<["pubkeyBits"], ["address"]>;

    describe("Convert Public Key to Address", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/eth.circom",
                "PubkeyToAddress",
            );
            circuit.setConstraint(
                "convert 512-bit public key to Ethereum address",
            );
        });

        afterAll(async function (): Promise<void> {
            if (circuit) {
                await circuit.release();
            }
        });

        it("should convert random 512 bits to Ethereum address", async function (): Promise<void> {
            const pubkeyBitsArray: Bit[][] = [
                // 1. All zeros
                new Array(512).fill(0),

                // 2. All ones
                new Array(512).fill(1),

                // 3. Alternating 0000000011111111 pattern (8 bits each)
                Array.from({ length: 512 }, (_, i) => Math.floor(i / 8) % 2),

                // 4. Random bits
                Array.from({ length: 512 }, () => Math.floor(Math.random() * 2))
            ]

            for (const pubkeyBits of pubkeyBitsArray) {
                const address = pubkeyToAddress(pubkeyBits);
                await circuit.expectPass({ pubkeyBits }, { address });
            }
        });

        it("should convert real ECDSA public key bits to corresponding Ethereum address", async function (): Promise<void> {
            const pubkey: EcdsaPoint = {
                x: [
                    16112729477231238493n,
                    1263491400844624069n,
                    9397608230358965727n,
                    13022681780633155002n
                ],
                y: [
                    5088976469350123869n,
                    14288148230842228320n,
                    1974812706588861334n,
                    6651912937076820324n
                ],
                isInfinity: false
            }
            const pubkeyBits = flattenPubkey([pubkey.x, pubkey.y]);
            const address = 771409570063672659947196271703710823584540976154n
            await circuit.expectPass({ pubkeyBits }, { address });
        });
    });
});
