// import { circom_tester } from "circom_tester";
// import path from "path";

// // 定義測試案例的型別
// interface TestCase {
//   char: string;
//   ascii: number;
//   expected: number;
// }

// interface BoundaryTest {
//   ascii: number;
//   desc: string;
// }

// // 定義電路實例的型別
// interface CircuitInstance {
//   calculateWitness(input: { char: number }): Promise<bigint[]>;
//   checkConstraints(witness: bigint[]): Promise<void>;
// }

// describe("Base64 Character to Value Conversion", function () {
//   let circuit: CircuitInstance;

//   // 在所有測試開始前編譯電路
//   beforeAll(async function (): Promise<void> {
//     // 假設你的電路文件在 circuits/base64/ 目錄下
//     circuit = await circom_tester.wasm(
//       path.join(__dirname, "circuits", "base64", "base64.circom")
//     );
//   }, 30000); // 30秒超時，因為編譯可能需要時間

//   // 測試大寫字母 A-Z (Base64: 0-25)
//   describe("Uppercase Letters (A-Z)", function (): void {
//     const testCases: TestCase[] = [
//       { char: "A", ascii: 65, expected: 0 },
//       { char: "B", ascii: 66, expected: 1 },
//       { char: "C", ascii: 67, expected: 2 },
//       { char: "M", ascii: 77, expected: 12 },
//       { char: "Z", ascii: 90, expected: 25 },
//     ];

//     testCases.forEach(({ char, ascii, expected }: TestCase): void => {
//       test(`should convert '${char}' (ASCII ${ascii}) to ${expected}`, async function (): Promise<void> {
//         const input: { char: number } = { char: ascii };
//         const witness: bigint[] = await circuit.calculateWitness(input);

//         // 檢查約束是否滿足
//         await circuit.checkConstraints(witness);

//         // 檢查輸出值 (根據 .sym 文件，value 在索引 1)
//         expect(witness[1]).toBe(BigInt(expected));
//       });
//     });
//   });

//   // 測試小寫字母 a-z (Base64: 26-51)
//   describe("Lowercase Letters (a-z)", function (): void {
//     const testCases: TestCase[] = [
//       { char: "a", ascii: 97, expected: 26 },
//       { char: "b", ascii: 98, expected: 27 },
//       { char: "m", ascii: 109, expected: 38 },
//       { char: "y", ascii: 121, expected: 50 },
//       { char: "z", ascii: 122, expected: 51 },
//     ];

//     testCases.forEach(({ char, ascii, expected }: TestCase): void => {
//       test(`should convert '${char}' (ASCII ${ascii}) to ${expected}`, async function (): Promise<void> {
//         const input: { char: number } = { char: ascii };
//         const witness: bigint[] = await circuit.calculateWitness(input);

//         await circuit.checkConstraints(witness);
//         expect(witness[1]).toBe(BigInt(expected));
//       });
//     });
//   });

//   // 測試數字 0-9 (Base64: 52-61)
//   describe("Digits (0-9)", function (): void {
//     const testCases: TestCase[] = [
//       { char: "0", ascii: 48, expected: 52 },
//       { char: "1", ascii: 49, expected: 53 },
//       { char: "5", ascii: 53, expected: 57 },
//       { char: "9", ascii: 57, expected: 61 },
//     ];

//     testCases.forEach(({ char, ascii, expected }: TestCase): void => {
//       test(`should convert '${char}' (ASCII ${ascii}) to ${expected}`, async function (): Promise<void> {
//         const input: { char: number } = { char: ascii };
//         const witness: bigint[] = await circuit.calculateWitness(input);

//         await circuit.checkConstraints(witness);
//         expect(witness[1]).toBe(BigInt(expected));
//       });
//     });
//   });

//   // 測試特殊字符 +, /, = (Base64: 62, 63, 64)
//   describe("Special Characters (+, /, =)", function (): void {
//     const testCases: TestCase[] = [
//       { char: "+", ascii: 43, expected: 62 },
//       { char: "/", ascii: 47, expected: 63 },
//       { char: "=", ascii: 61, expected: 64 },
//     ];

//     testCases.forEach(({ char, ascii, expected }: TestCase): void => {
//       test(`should convert '${char}' (ASCII ${ascii}) to ${expected}`, async function (): Promise<void> {
//         const input: { char: number } = { char: ascii };
//         const witness: bigint[] = await circuit.calculateWitness(input);

//         await circuit.checkConstraints(witness);
//         expect(witness[1]).toBe(BigInt(expected));
//       });
//     });
//   });

//   // 測試完整的 Base64 字符集
//   describe("Complete Base64 Character Set", function (): void {
//     test("should handle all valid Base64 characters", async function (): Promise<void> {
//       const base64Chars: string =
//         "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

//       for (let i = 0; i < base64Chars.length; i++) {
//         const char: string = base64Chars[i];
//         const ascii: number = char.charCodeAt(0);
//         const expectedValue: number = i === 64 ? 64 : i; // '=' 是特殊情況

//         const input: { char: number } = { char: ascii };
//         const witness: bigint[] = await circuit.calculateWitness(input);

//         await circuit.checkConstraints(witness);
//         expect(witness[1]).toBe(BigInt(expectedValue));
//       }
//     });
//   });

//   // 測試邊界情況
//   describe("Edge Cases", function (): void {
//     test("should reject invalid characters", async function (): Promise<void> {
//       const invalidChars: number[] = [32, 33, 35, 64, 91, 96, 123]; // space, !, #, @, [, `, {

//       for (const ascii of invalidChars) {
//         const input: { char: number } = { char: ascii };

//         // 預期這些輸入會導致約束失敗
//         await expect(async (): Promise<void> => {
//           const witness: bigint[] = await circuit.calculateWitness(input);
//           await circuit.checkConstraints(witness);
//         }).rejects.toThrow();
//       }
//     });
//   });

//   // 性能測試
//   describe("Performance Tests", function (): void {
//     test("should handle multiple calculations efficiently", async function (): Promise<void> {
//       const startTime: number = Date.now();

//       // 測試 100 個隨機有效字符
//       const validAscii: number[] = [
//         ...Array.from({ length: 26 }, (_, i): number => 65 + i), // A-Z
//         ...Array.from({ length: 26 }, (_, i): number => 97 + i), // a-z
//         ...Array.from({ length: 10 }, (_, i): number => 48 + i), // 0-9
//         43,
//         47,
//         61, // +, /, =
//       ];

//       for (let i = 0; i < 100; i++) {
//         const randomAscii: number =
//           validAscii[Math.floor(Math.random() * validAscii.length)];
//         const input: { char: number } = { char: randomAscii };
//         const witness: bigint[] = await circuit.calculateWitness(input);
//         await circuit.checkConstraints(witness);
//       }

//       const endTime: number = Date.now();
//       const duration: number = endTime - startTime;

//       // 應該在合理時間內完成 (例如 10 秒)
//       expect(duration).toBeLessThan(10000);
//       console.log(`100 calculations completed in ${duration}ms`);
//     });
//   });

//   // 輔助函數測試 - 驗證內部邏輯
//   describe("Internal Logic Verification", function (): void {
//     test("should correctly identify character ranges", async function (): Promise<void> {
//       // 測試邊界值
//       const boundaryTests: BoundaryTest[] = [
//         { ascii: 65, desc: "A - first uppercase" },
//         { ascii: 90, desc: "Z - last uppercase" },
//         { ascii: 97, desc: "a - first lowercase" },
//         { ascii: 122, desc: "z - last lowercase" },
//         { ascii: 48, desc: "0 - first digit" },
//         { ascii: 57, desc: "9 - last digit" },
//       ];

//       for (const { ascii, desc } of boundaryTests) {
//         const input: { char: number } = { char: ascii };
//         const witness: bigint[] = await circuit.calculateWitness(input);

//         await circuit.checkConstraints(witness);

//         // 驗證輸入確實在 witness 中
//         expect(witness[2]).toBe(BigInt(ascii)); // char 在索引 2

//         console.log(`✓ ${desc}: ASCII ${ascii} -> Base64 ${witness[1]}`);
//       }
//     });
//   });
// });
