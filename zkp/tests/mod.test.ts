import { compile_wasm, WitnessTester } from "./utils";

describe("Modulo Circuit", function () {
  let circuit: WitnessTester<['in', 'modulus'], ['quotient', 'remainder']>;

  describe("6-bit Modulo Operations", function (): void {
    beforeAll(async function (): Promise<void> {

      circuit = new WitnessTester(
        await compile_wasm("./shared/components/mod.circom", {
          templateParams: ["6"],
        }));
    });

    test("should calculate valid modulus correctly", async function (): Promise<void> {
      const testCases = [
        { in: 0, modulus: 16 },
        { in: 1, modulus: 16 },
        { in: 15, modulus: 16 },
        { in: 16, modulus: 16 },
        { in: 17, modulus: 16 },
        { in: 31, modulus: 16 },
        { in: 32, modulus: 16 },
        { in: 255, modulus: 16 },
        { in: 0, modulus: 3 },
        { in: 8, modulus: 9 },
        { in: 11, modulus: 11 },
        { in: 7, modulus: 12 },
        { in: 13, modulus: 32 },
        { in: 13, modulus: 33 },
        { in: 32, modulus: 37 },
        { in: 0, modulus: 63 },
        { in: 1, modulus: 63 },
      ];

      for (const testCase of testCases) {
        circuit.expectPass(testCase, {
          quotient: BigInt(Math.floor(testCase.in / testCase.modulus)),
          remainder: BigInt(testCase.in % testCase.modulus),
        })

        // const witness = await circuit.calculateWitness(testCase);
        // await circuit.checkConstraints(witness);
        // await circuit.assertOut(witness, {
        //   quotient: BigInt(Math.floor(testCase.in / testCase.modulus)),
        //   remainder: BigInt(testCase.in % testCase.modulus),
        // });
      }
    });

    // test("should contraint modulus", async function (): Promise<void> {
    //   const testCases = [
    //     { in: 0, modulus: 64 },
    //     { in: 1, modulus: 64 },
    //     { in: 16, modulus: 64 },
    //     { in: 63, modulus: 64 },
    //     { in: 64, modulus: 64 },
    //     { in: 65, modulus: 64 },
    //     { in: 0, modulus: 100 },
    //     { in: 1, modulus: 100 },
    //   ];

    //   for (const testCase of testCases) {
    //     await expect(circuit.calculateWitness(testCase)).rejects.toThrow();
    //   }
    // });

    // test("should not contraint input value", async function (): Promise<void> {
    //   const testCases = [
    //     { in: 24, modulus: 12 },
    //     { in: 120, modulus: 12 },
    //     { in: 64, modulus: 16 },
    //     { in: 300, modulus: 16 },
    //     { in: 62, modulus: 63 },
    //     { in: 63, modulus: 63 },
    //     { in: 64, modulus: 63 },
    //     { in: 300, modulus: 63 },
    //   ];

    //   for (const testCase of testCases) {
    //     const witness = await circuit.calculateWitness(testCase);
    //     await circuit.checkConstraints(witness);
    //     await circuit.assertOut(witness, {
    //       quotient: BigInt(Math.floor(testCase.in / testCase.modulus)),
    //       remainder: BigInt(testCase.in % testCase.modulus),
    //     });
    //   }
    // });
    // });

    // describe("8-bit Modulo Operations", function (): void {
    //   beforeAll(async function (): Promise<void> {
    //     try {
    //       circuit = await compileToWasm("./shared/components/mod.circom", {
    //         templateParams: ["8"],
    //       });
    //     } catch (error) {
    //       console.error("Failed to load circuit:", error);
    //       throw error;
    //     }
    //   }, 30000);

    //   test("should calculate valid modulus correctly", async function (): Promise<void> {
    //     const testCases = [
    //       { in: 0, modulus: 16 },
    //       { in: 1, modulus: 16 },
    //       { in: 15, modulus: 16 },
    //       { in: 16, modulus: 16 },
    //       { in: 17, modulus: 16 },
    //       { in: 31, modulus: 16 },
    //       { in: 32, modulus: 16 },
    //       { in: 255, modulus: 16 },
    //       { in: 0, modulus: 3 },
    //       { in: 8, modulus: 9 },
    //       { in: 11, modulus: 11 },
    //       { in: 7, modulus: 12 },
    //       { in: 13, modulus: 32 },
    //       { in: 13, modulus: 33 },
    //       { in: 32, modulus: 37 },
    //       { in: 28, modulus: 109 },
    //       { in: 0, modulus: 255 },
    //       { in: 1, modulus: 255 },
    //     ];

    //     for (const testCase of testCases) {
    //       const witness = await circuit.calculateWitness(testCase);

    //       await circuit.checkConstraints(witness);
    //       await circuit.assertOut(witness, {
    //         quotient: BigInt(Math.floor(testCase.in / testCase.modulus)),
    //         remainder: BigInt(testCase.in % testCase.modulus),
    //       });
    //     }
    //   });

    //   test("should contraint invalid modulus", async function (): Promise<void> {
    //     const testCases = [
    //       { in: 0, modulus: 256 },
    //       { in: 1, modulus: 256 },
    //       { in: 191, modulus: 256 },
    //       { in: 192, modulus: 256 },
    //       { in: 255, modulus: 256 },
    //       { in: 256, modulus: 256 },
    //       { in: 257, modulus: 256 },
    //       { in: 1024, modulus: 256 },
    //       { in: 0, modulus: 300 },
    //       { in: 1, modulus: 300 },
    //     ];

    //     for (const testCase of testCases) {
    //       const input = { in: testCase.in, modulus: testCase.modulus };
    //       await expect(circuit.calculateWitness(input)).rejects.toThrow();
    //     }
    //   });

    //   test("should not contraint input value", async function (): Promise<void> {
    //     const testCases = [
    //       { in: 24, modulus: 12 },
    //       { in: 120, modulus: 12 },
    //       { in: 64, modulus: 16 },
    //       { in: 300, modulus: 16 },
    //       { in: 255, modulus: 255 },
    //       { in: 256, modulus: 255 },
    //       { in: 1024, modulus: 255 },
    //     ];

    //     for (const testCase of testCases) {
    //       const witness = await circuit.calculateWitness(testCase);
    //       await circuit.checkConstraints(witness);
    //       await circuit.assertOut(witness, {
    //         quotient: BigInt(Math.floor(testCase.in / testCase.modulus)),
    //         remainder: BigInt(testCase.in % testCase.modulus),
    //       });
    //     }
    //   });
  });
});
