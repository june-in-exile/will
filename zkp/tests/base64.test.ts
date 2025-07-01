import path from "path";
const circom_tester = require("circom_tester");
import type { CircuitInstance } from "circom_tester";

describe("Base64 Character to Value Conversion", function () {
  let circuit: CircuitInstance;

  beforeAll(async function (): Promise<void> {
    try {
      const circuitPath = path.join(
        __dirname,
        "..",
        "circuits",
        "base64",
        "base64.circom"
      );

      circuit = await circom_tester.wasm(circuitPath, {
        include: [
          path.join(__dirname, "..", "node_modules"),
          path.join(__dirname, "..", "node_modules", "circomlib", "circuits"),
        ],
      });
    } catch (error) {
      console.error("Failed to load circuit:", error);
      throw error;
    }
  }, 30000);

  describe("Complete Base64 Character Set", function (): void {
    test("should handle all valid Base64 characters", async function (): Promise<void> {
      const base64Chars: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

      for (let i = 0; i < base64Chars.length; i++) {
        const char: string = base64Chars[i];
        const ascii: number = char.charCodeAt(0);
        const expectedValue: number = i === 64 ? 64 : i; // '=' 是特殊情況

        const input: { char: number } = { char: ascii };
        const witness: bigint[] = await circuit.calculateWitness(input);

        await circuit.checkConstraints(witness);
        expect(witness[1]).toBe(BigInt(expectedValue));
      }
    });
  });
});
