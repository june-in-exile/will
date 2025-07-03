import { Circomkit, WitnessTester } from "circomkit";

describe("InRange Circuit", function () {
    let circuit: WitnessTester<["in", "min", "max"], ["out"]>;

    describe("Basic 4-bit Range Validation", function (): void {
        beforeAll(async function (): Promise<void> {
            const circomkit = new Circomkit();
            circuit = await circomkit.WitnessTester("range", {
                file: "shared/components/range",
                template: "InRange",
                params: [4]
            });
        });

        test("should validate full range [0, 15]", async function (): Promise<void> {
            for (let value = 0; value <= 15; value++) {
                await circuit.expectPass({ in: value, min: 0, max: 15 }, { out: 1 });
            }
        });

        test("should validate custom range [3, 8]", async function (): Promise<void> {
            const min = 3, max = 8;
            for (let value = 0; value <= 15; value++) {
                const expected = (min <= value && value <= max) ? 1 : 0;
                await circuit.expectPass({ in: value, min, max }, { out: expected });
            }
        });

        test("should constraint in, min and max", async function (): Promise<void> {
            const testCases = [
                { in: 16, min: 0, max: 15 },
                { in: 5, min: 16, max: 20 },
                { in: 18, min: 16, max: 20 },
                { in: 10, min: 16, max: 8 },
                { in: 5, min: 16, max: 8 },
                { in: 7, min: 0, max: 16 },
                { in: 7, min: 0, max: 20 },
                { in: 0, min: 7, max: 20 },
            ];

            for (const testCase of testCases) {
                await circuit.expectFail(testCase);
            }
        });
    });

    describe("Basic 8-bit Range Validation", function (): void {
        let circuit: WitnessTester<["in", "min", "max"], ["out"]>;

        beforeAll(async function (): Promise<void> {
            const circomkit = new Circomkit();
            circuit = await circomkit.WitnessTester("range", {
                file: "shared/components/range",
                template: "InRange",
                params: [8]
            });
        });

        test("should validate full range [0, 255]", async function (): Promise<void> {
            const testCases = [
                { in: 0, min: 0, max: 255 },
                { in: 1, min: 0, max: 255 },
                { in: 127, min: 0, max: 255 },
                { in: 254, min: 0, max: 255 },
                { in: 255, min: 0, max: 255 },
            ];

            for (const testCase of testCases) {
                await circuit.expectPass(testCase, { out: 1 });
            }
        });

        test("should validate custom range [10, 100]", async function (): Promise<void> {
            const testCases = [
                { in: 9, min: 10, max: 100, expected: 0 },
                { in: 10, min: 10, max: 100, expected: 1 },
                { in: 11, min: 10, max: 100, expected: 1 },
                { in: 50, min: 10, max: 100, expected: 1 },
                { in: 99, min: 10, max: 100, expected: 1 },
                { in: 100, min: 10, max: 100, expected: 1 },
                { in: 101, min: 10, max: 100, expected: 0 },
            ];

            for (const testCase of testCases) {
                await circuit.expectPass(
                    { in: testCase.in, min: testCase.min, max: testCase.max },
                    { out: testCase.expected }
                );
            }
        });

        test("should handle exact boundary values correctly", async function (): Promise<void> {
            const testCases = [
                { in: 49, min: 50, max: 200, expected: 0 },
                { in: 50, min: 50, max: 200, expected: 1 },
                { in: 51, min: 50, max: 200, expected: 1 },
                { in: 199, min: 50, max: 200, expected: 1 },
                { in: 200, min: 50, max: 200, expected: 1 },
                { in: 201, min: 50, max: 200, expected: 0 },
            ];

            for (const testCase of testCases) {
                await circuit.expectPass(
                    { in: testCase.in, min: testCase.min, max: testCase.max },
                    { out: testCase.expected }
                );
            }
        });
    });
});