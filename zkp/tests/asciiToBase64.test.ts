import { WitnessTester } from "./utils";

describe("Base64 Character to Value Conversion", function () {
  let circuit: WitnessTester<["asciiCode"], ["base64Value"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.create(
      "./shared/components/asciiToBase64.circom",
    );
  });

  describe("Complete Base64 Character Set", function (): void {
    test("should handle all valid Base64 characters", async function (): Promise<void> {
      const base64Chars: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

      for (let i = 0; i < base64Chars.length; i++) {
        const char: string = base64Chars[i];
        const asciiCode: number = char.charCodeAt(0);
        // const base64Value: number = i === 64 ? 64 : i; // '=' is special case
        const base64Value: number = i;

        await circuit.expectPass({ asciiCode }, { base64Value });
      }
    });
  });

  describe("Invalid Base64 Characters", function (): void {
    test("should handle invalid characters", async function (): Promise<void> {
      const invalidChars = [
        64, // "@"
        35, // "#"
        36, // "$"
        37, // "%"
        38, // "&"
        42, // "*"
        33, // "!"
        63, // "?"
        32, // " "
        10, // "\n"
        9, // "\t"
      ];

      for (const asciiCode of invalidChars) {
        await circuit.expectFail({ asciiCode });
      }
    });

    test("should handle characters adjacent to valid range", async function (): Promise<void> {
      const adjacentInvalid = [
        46, // '/' 's previous character ('.')
        58, // '9' 's next character (':')
        64, // 'A' 's previous character ('@')
        91, // 'Z' 's next character ('[')
        96, // 'a' 's previous character ('`')
        123, // 'z' 's next character ('{')
      ];

      for (const asciiCode of adjacentInvalid) {
        await circuit.expectFail({ asciiCode });
      }
    });
  });
});
