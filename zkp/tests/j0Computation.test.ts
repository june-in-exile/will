import { WitnessTester } from "./utils";
import { AESUtils, AESGCM, GF128 } from "./helpers";

describe.skip("ComputeJ0 Circuits", function () {
    describe("ComputeJ0_96bit Circuit", function () {
        let circuit: WitnessTester<["iv"], ["j0"]>;

        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/aes256ctr/j0Computation.circom",
                "ComputeJ0_96bit",
            );
            console.info(
                "ComputeJ0_96bit circuit constraints:",
                await circuit.getConstraintCount(),
            );
        });

        it("should correctly compute J0 for 12-byte IV", async function (): Promise<void> {
            const testCases = [
                {
                    iv: new Array(12).fill(0x00),
                    expectedJ0: [
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01
                    ]
                },
                {
                    iv: [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c],
                    expectedJ0: [
                        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
                        0x09, 0x0a, 0x0b, 0x0c, 0x00, 0x00, 0x00, 0x01
                    ]
                },
                {
                    iv: new Array(12).fill(0xff),
                    expectedJ0: [
                        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
                        0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x01
                    ]
                }
            ];

            for (const { iv, expectedJ0 } of testCases) {
                await circuit.expectPass({ iv: iv }, { j0: expectedJ0 });
            }
        });

        it("should handle random 12-byte IVs", async function (): Promise<void> {
            for (let i = 0; i < 3; i++) {
                const iv = Array.from(AESUtils.randomBytes(12));
                const expectedJ0 = [...iv, 0x00, 0x00, 0x00, 0x01];

                await circuit.expectPass({ iv: iv }, { j0: expectedJ0 });
            }
        });
    });

    describe("GF128Multiply Circuit", function () {
        let circuit: WitnessTester<["x", "y"], ["result"]>;

        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/aes256ctr/j0Computation.circom",
                "GF128Multiply",
            );
            console.info(
                "GF128Multiply circuit constraints:",
                await circuit.getConstraintCount(),
            );
        });

        it("should correctly multiply in GF(2^128)", async function (): Promise<void> {
            const testCases = [
                {
                    // Multiplication by zero
                    x: new Array(16).fill(0x00),
                    y: Array.from(AESUtils.randomBytes(16)),
                    expectedResult: new Array(16).fill(0x00)
                },
                {
                    // Multiplication by one (represented as 0x80000...0)
                    x: [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                    y: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
                        0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10],
                    expectedResult: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
                        0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10]
                }
            ];

            for (const { x, y, expectedResult } of testCases) {
                await circuit.expectPass(
                    { x: x, y: y },
                    { result: expectedResult }
                );
            }
        });

        it("should match TypeScript GF128 implementation", async function (): Promise<void> {
            // Test random multiplications
            for (let i = 0; i < 3; i++) {
                const x = Array.from(AESUtils.randomBytes(16));
                const y = Array.from(AESUtils.randomBytes(16));

                const expectedResult = Array.from(
                    GF128.multiply(Buffer.from(x), Buffer.from(y))
                );

                await circuit.expectPass(
                    { x: x, y: y },
                    { result: expectedResult }
                );
            }
        });
    });

    describe("ComputeJ0_Variable Circuit", function () {
        describe("8-byte IV", function () {
            let circuit: WitnessTester<["iv", "hashKey"], ["j0"]>;

            beforeAll(async function (): Promise<void> {
                circuit = await WitnessTester.construct(
                    "circuits/shared/components/aes256ctr/j0Computation.circom",
                    "ComputeJ0_Variable",
                    { ivLengthBytes: 8 }
                );
                console.info(
                    "ComputeJ0_Variable(8) circuit constraints:",
                    await circuit.getConstraintCount(),
                );
            });

            it("should correctly compute J0 for 8-byte IV", async function (): Promise<void> {
                const iv = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08];
                const hashKey = Array.from(AESUtils.randomBytes(16));

                // Compute expected J0 using TypeScript implementation
                const expectedJ0 = Array.from(
                    AESGCM.computeJ0(Buffer.from(iv), Buffer.from(hashKey))
                );

                await circuit.expectPass(
                    { iv: iv, hashKey: hashKey },
                    { j0: expectedJ0 }
                );
            });
        });

        describe("16-byte IV", function () {
            let circuit: WitnessTester<["iv", "hashKey"], ["j0"]>;

            beforeAll(async function (): Promise<void> {
                circuit = await WitnessTester.construct(
                    "circuits/shared/components/aes256ctr/j0Computation.circom",
                    "ComputeJ0_Variable",
                    { ivLengthBytes: 16 }
                );
                console.info(
                    "ComputeJ0_Variable(16) circuit constraints:",
                    await circuit.getConstraintCount(),
                );
            });

            it("should correctly compute J0 for 16-byte IV", async function (): Promise<void> {
                const testCases = [
                    {
                        iv: new Array(16).fill(0x00),
                        hashKey: Array.from(AESUtils.randomBytes(16))
                    },
                    {
                        iv: Array.from({ length: 16 }, (_, i) => i),
                        hashKey: [
                            0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b,
                            0x88, 0x4c, 0xfa, 0x59, 0xca, 0x34, 0x2b, 0x2e
                        ]
                    },
                    {
                        iv: new Array(16).fill(0xff),
                        hashKey: new Array(16).fill(0x55)
                    }
                ];

                for (const { iv, hashKey } of testCases) {
                    const expectedJ0 = Array.from(
                        AESGCM.computeJ0(Buffer.from(iv), Buffer.from(hashKey))
                    );

                    await circuit.expectPass(
                        { iv: iv, hashKey: hashKey },
                        { j0: expectedJ0 }
                    );
                }
            });

            it("should handle random 16-byte IVs", async function (): Promise<void> {
                for (let i = 0; i < 3; i++) {
                    const iv = Array.from(AESUtils.randomBytes(16));
                    const hashKey = Array.from(AESUtils.randomBytes(16));

                    const expectedJ0 = Array.from(
                        AESGCM.computeJ0(Buffer.from(iv), Buffer.from(hashKey))
                    );

                    await circuit.expectPass(
                        { iv: iv, hashKey: hashKey },
                        { j0: expectedJ0 }
                    );
                }
            });
        });

        describe("Various IV lengths", function () {
            it("should correctly compute J0 for different IV lengths", async function (): Promise<void> {
                const ivLengths = [1, 4, 7, 8, 13, 15, 16];

                for (const length of ivLengths) {
                    if (length === 12) continue; // Skip 12-byte case

                    const circuit = await WitnessTester.construct(
                        "circuits/shared/components/aes256ctr/j0Computation.circom",
                        "ComputeJ0_Variable",
                        { ivLengthBytes: length }
                    );

                    const iv = Array.from(AESUtils.randomBytes(length));
                    const hashKey = Array.from(AESUtils.randomBytes(16));

                    const expectedJ0 = Array.from(
                        AESGCM.computeJ0(Buffer.from(iv), Buffer.from(hashKey))
                    );

                    await circuit.expectPass(
                        { iv: iv, hashKey: hashKey },
                        { j0: expectedJ0 }
                    );
                }
            });
        });
    });
});