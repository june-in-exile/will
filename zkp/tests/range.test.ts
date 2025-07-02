// import path from "path";
// const circom_tester = require("circom_tester");
// import type { CircuitInstance } from "circom_tester";

// describe("InRange Circuit", function () {
//   let circuit8_0_255: CircuitInstance;  // 8-bit, range [0, 255]
//   let circuit8_10_100: CircuitInstance; // 8-bit, range [10, 100]
//   let circuit6_0_63: CircuitInstance;   // 6-bit, range [0, 63]
//   let circuit8_50_200: CircuitInstance; // 8-bit, range [50, 200]

//   beforeAll(async function (): Promise<void> {
//     try {
//       const circuitPath = path.join(
//         __dirname,
//         "..",
//         "circuits",
//         "shared",
//         "components",
//         "range.circom"
//       );

//       // Test different parameter combinations
//       circuit8_0_255 = await circom_tester.wasm(circuitPath, {
//         include: [
//           path.join(__dirname, "..", "node_modules"),
//           path.join(__dirname, "..", "node_modules", "circomlib", "circuits"),
//         ],
//         compileFlags: ["--O2"],
//         param: ["bits", "8", "min", "0", "max", "255"],
//       });

//       circuit8_10_100 = await circom_tester.wasm(circuitPath, {
//         include: [
//           path.join(__dirname, "..", "node_modules"),
//           path.join(__dirname, "..", "node_modules", "circomlib", "circuits"),
//         ],
//         compileFlags: ["--O2"],
//         param: ["bits", "8", "min", "10", "max", "100"],
//       });

//       circuit6_0_63 = await circom_tester.wasm(circuitPath, {
//         include: [
//           path.join(__dirname, "..", "node_modules"),
//           path.join(__dirname, "..", "node_modules", "circomlib", "circuits"),
//         ],
//         compileFlags: ["--O2"],
//         param: ["bits", "6", "min", "0", "max", "63"],
//       });

//       circuit8_50_200 = await circom_tester.wasm(circuitPath, {
//         include: [
//           path.join(__dirname, "..", "node_modules"),
//           path.join(__dirname, "..", "node_modules", "circomlib", "circuits"),
//         ],
//         compileFlags: ["--O2"],
//         param: ["bits", "8", "min", "50", "max", "200"],
//       });
//     } catch (error) {
//       console.error("Failed to load InRange circuit:", error);
//       throw error;
//     }
//   }, 30000);

//   describe("Basic Range Validation", function (): void {
//     test("should validate full 8-bit range [0, 255]", async function (): Promise<void> {
//       const testCases = [
//         { input: 0, expected: 1 },     // At minimum boundary
//         { input: 1, expected: 1 },     // Just above minimum
//         { input: 127, expected: 1 },   // Middle value
//         { input: 254, expected: 1 },   // Just below maximum
//         { input: 255, expected: 1 },   // At maximum boundary
//       ];

//       for (const testCase of testCases) {
//         const input = { in: testCase.input };
//         const witness = await circuit8_0_255.calculateWitness(input);

//         await circuit8_0_255.checkConstraints(witness);
//         const result = witness[1]; // output signal is at index 1

//         expect(result).toBe(BigInt(testCase.expected));
//         console.log(`${testCase.input} in range [0, 255]: ${result}`);
//       }
//     });

//     test("should validate custom range [10, 100]", async function (): Promise<void> {
//       const testCases = [
//         { input: 9, expected: 0 },     // Below minimum
//         { input: 10, expected: 1 },    // At minimum boundary
//         { input: 11, expected: 1 },    // Just above minimum
//         { input: 50, expected: 1 },    // Middle value
//         { input: 99, expected: 1 },    // Just below maximum
//         { input: 100, expected: 1 },   // At maximum boundary
//         { input: 101, expected: 0 },   // Above maximum
//       ];

//       for (const testCase of testCases) {
//         const input = { in: testCase.input };
//         const witness = await circuit8_10_100.calculateWitness(input);

//         await circuit8_10_100.checkConstraints(witness);
//         const result = witness[1];

//         expect(result).toBe(BigInt(testCase.expected));
//         console.log(`${testCase.input} in range [10, 100]: ${result}`);
//       }
//     });
//   });

//   describe("Boundary Testing", function (): void {
//     test("should handle exact boundary values correctly", async function (): Promise<void> {
//       // Test range [50, 200]
//       const boundaryTests = [
//         { input: 49, expected: 0, description: "one below minimum" },
//         { input: 50, expected: 1, description: "exactly at minimum" },
//         { input: 51, expected: 1, description: "one above minimum" },
//         { input: 199, expected: 1, description: "one below maximum" },
//         { input: 200, expected: 1, description: "exactly at maximum" },
//         { input: 201, expected: 0, description: "one above maximum" },
//       ];

//       for (const test of boundaryTests) {
//         const input = { in: test.input };
//         const witness = await circuit8_50_200.calculateWitness(input);

//         await circuit8_50_200.checkConstraints(witness);
//         const result = witness[1];

//         expect(result).toBe(BigInt(test.expected));
//         console.log(`${test.input} (${test.description}): ${result}`);
//       }
//     });
//   });

//   describe("Edge Cases", function (): void {
//     test("should handle zero values correctly", async function (): Promise<void> {
//       // Test zero in different ranges
//       const zeroTests = [
//         { circuit: circuit8_0_255, expected: 1, range: "[0, 255]" },
//         { circuit: circuit8_10_100, expected: 0, range: "[10, 100]" },
//         { circuit: circuit6_0_63, expected: 1, range: "[0, 63]" },
//         { circuit: circuit8_50_200, expected: 0, range: "[50, 200]" },
//       ];

//       for (const test of zeroTests) {
//         const input = { in: 0 };
//         const witness = await test.circuit.calculateWitness(input);

//         await test.circuit.checkConstraints(witness);
//         const result = witness[1];

//         expect(result).toBe(BigInt(test.expected));
//         console.log(`0 in range ${test.range}: ${result}`);
//       }
//     });

//     test("should handle maximum possible values for bit width", async function (): Promise<void> {
//       // Test maximum values based on bit width
//       const maxValueTests = [
//         { input: 63, circuit: circuit6_0_63, expected: 1, description: "6-bit max in [0, 63]" },
//         { input: 255, circuit: circuit8_0_255, expected: 1, description: "8-bit max in [0, 255]" },
//         { input: 255, circuit: circuit8_10_100, expected: 0, description: "8-bit max in [10, 100]" },
//         { input: 255, circuit: circuit8_50_200, expected: 0, description: "8-bit max in [50, 200]" },
//       ];

//       for (const test of maxValueTests) {
//         const input = { in: test.input };
//         const witness = await test.circuit.calculateWitness(input);

//         await test.circuit.checkConstraints(witness);
//         const result = witness[1];

//         expect(result).toBe(BigInt(test.expected));
//         console.log(`${test.description}: ${result}`);
//       }
//     });
//   });

//   describe("Random Value Testing", function (): void {
//     test("should correctly validate random values in range [10, 100]", async function (): Promise<void> {
//       const randomTestValues = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 150];

//       for (const value of randomTestValues) {
//         const input = { in: value };
//         const witness = await circuit8_10_100.calculateWitness(input);

//         await circuit8_10_100.checkConstraints(witness);
//         const result = Number(witness[1]);

//         // Verify mathematical correctness
//         const expectedResult = (value >= 10 && value <= 100) ? 1 : 0;
//         expect(result).toBe(expectedResult);

//         console.log(`${value} in range [10, 100]: ${result} (expected: ${expectedResult})`);
//       }
//     });
//   });

//   describe("Comprehensive Range Testing", function (): void {
//     test("should validate all values in small range", async function (): Promise<void> {
//       // Test all values from 0 to 20 against range [5, 15]
//       const testRange = { min: 5, max: 15 };

//       for (let value = 0; value <= 20; value++) {
//         const input = { in: value };
//         const witness = await circuit8_10_100.calculateWitness(input);

//         await circuit8_10_100.checkConstraints(witness);
//         const result = Number(witness[1]);

//         // For the [10, 100] circuit, adjust expectations
//         const expectedResult = (value >= 10 && value <= 100) ? 1 : 0;
//         expect(result).toBe(expectedResult);
//       }
//     });
//   });

//   describe("Boolean Output Validation", function (): void {
//     test("should only output 0 or 1", async function (): Promise<void> {
//       const testValues = [0, 5, 10, 50, 100, 150, 200, 255];

//       for (const value of testValues) {
//         const circuits = [circuit8_0_255, circuit8_10_100, circuit6_0_63, circuit8_50_200];

//         for (const circuit of circuits) {
//           const input = { in: value };
//           const witness = await circuit.calculateWitness(input);

//           await circuit.checkConstraints(witness);
//           const result = Number(witness[1]);

//           // Output must be boolean (0 or 1)
//           expect(result).toBeGreaterThanOrEqual(0);
//           expect(result).toBeLessThanOrEqual(1);
//           expect(Number.isInteger(result)).toBe(true);
//         }
//       }
//     });
//   });

//   describe("Logic Verification", function (): void {
//     test("should implement correct AND logic for range checking", async function (): Promise<void> {
//       // InRange should output 1 only when (input >= min) AND (input <= max)
//       const testCases = [
//         { value: 25, min: 10, max: 100, expectedGEQ: 1, expectedLEQ: 1, expectedAND: 1 },
//         { value: 5, min: 10, max: 100, expectedGEQ: 0, expectedLEQ: 1, expectedAND: 0 },
//         { value: 150, min: 10, max: 100, expectedGEQ: 1, expectedLEQ: 0, expectedAND: 0 },
//         { value: 5, min: 10, max: 20, expectedGEQ: 0, expectedLEQ: 1, expectedAND: 0 },
//       ];

//       for (const testCase of testCases) {
//         // Use circuit8_10_100 for values that fit this range
//         if (testCase.min === 10 && testCase.max === 100) {
//           const input = { in: testCase.value };
//           const witness = await circuit8_10_100.calculateWitness(input);

//           await circuit8_10_100.checkConstraints(witness);
//           const result = Number(witness[1]);

//           expect(result).toBe(testCase.expectedAND);
//           console.log(`${testCase.value} in [${testCase.min}, ${testCase.max}]: ${result}`);
//         }
//       }
//     });
//   });
// });