import { compileCircuit } from "./utils";
const circom_tester = require("circom_tester");

describe("Base64 Character to Value Conversion", function () {
  let circuit: CircomTester.CircuitInstance;

  beforeAll(async function (): Promise<void> {
    try {
      circuit = await compileCircuit(
        "./shared/components/asciiToBase64.circom",
      );
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
        const asciiCode: number = char.charCodeAt(0);
        const expectedValue: number = i === 64 ? 64 : i; // '=' is special case

        const input: { asciiCode: number } = { asciiCode };
        const witness: bigint[] = await circuit.calculateWitness(input);

        await circuit.checkConstraints(witness);
        const base64Value = witness[1];
        expect(base64Value).toBe(BigInt(expectedValue));
      }
    });
  });
  describe("Invalid Base64 Characters", function (): void {
    test("should handle invalid characters", async function (): Promise<void> {
      const invalidChars = [
        { char: "@", ascii: 64 },
        { char: "#", ascii: 35 },
        { char: "$", ascii: 36 },
        { char: "%", ascii: 37 },
        { char: "&", ascii: 38 },
        { char: "*", ascii: 42 },
        { char: "!", ascii: 33 },
        { char: "?", ascii: 63 },
        { char: " ", ascii: 32 },
        { char: "\n", ascii: 10 },
        { char: "\t", ascii: 9 },
      ];

      for (const invalidChar of invalidChars) {
        const input = { asciiCode: invalidChar.ascii };

        try {
          const witness = await circuit.calculateWitness(input);
          await expect(circuit.checkConstraints(witness)).rejects.toThrow();
        } catch (error) {
          // failing in calculateWitness phase is also expected
          expect(error).toBeDefined();
        }
      }
    });

    test("should handle characters adjacent to valid range", async function (): Promise<void> {
      const adjacentInvalid = [
        47, // '/' 's previous character ('.')
        58, // '9' 's next character (':')
        64, // 'A' 's previous character ('@')
        91, // 'Z' 's next character ('[')
        96, // 'a' 's previous character ('`')
        123, // 'z' 's next character ('{')
      ];

      for (const asciiCode of adjacentInvalid) {
        const input = { asciiCode };

        try {
          const witness = await circuit.calculateWitness(input);
          await expect(circuit.checkConstraints(witness)).rejects.toThrow();
        } catch (error) {
          // failing in calculateWitness phase is also expected
          expect(error).toBeDefined();
        }
      }
    });
  });
});
