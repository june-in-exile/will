import { WitnessTester, ecdsaPointToBigInts } from "./util/index.js";
import { flattenPubkey } from "./logic/index.js";
import { ConcatedEcdsaPoint, Uint256 } from "./type/index.js";

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
