import { WitnessTester } from "./utils";
import { encodeUTF8 } from "./utils/utf8Encoder";

describe("Utf8Encoder Circuit", function (): void {
  let circuit: WitnessTester<["codepoint"], ["bytes", "validBytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct("./shared/components/utf8Encoder.circom");
    console.info("Utf8Encoder circuit constraints:", await circuit.getConstraintCount());
  });

  describe("Individual Character Encoding", function (): void {

    const testCases = [
      { char: 'A', codepoint: 65, description: "ASCII letter A" },
      { char: 'Z', codepoint: 90, description: "ASCII letter Z" },
      { char: '0', codepoint: 48, description: "ASCII digit 0" },
      { char: '9', codepoint: 57, description: "ASCII digit 9" },
      { char: ' ', codepoint: 32, description: "ASCII space" },
      { char: '!', codepoint: 33, description: "ASCII exclamation" },
      { char: '\x00', codepoint: 0, description: "Null character" },
      { char: '\x7F', codepoint: 127, description: "DEL character (last 1-byte)" },

      { char: 'ñ', codepoint: 241, description: "Spanish ñ" },
      { char: 'ü', codepoint: 252, description: "German ü" },
      { char: 'é', codepoint: 233, description: "French é" },
      { char: 'α', codepoint: 945, description: "Greek alpha" },
      { char: 'β', codepoint: 946, description: "Greek beta" },
      { char: 'ж', codepoint: 1078, description: "Cyrillic zh" },
      { char: '\u0080', codepoint: 128, description: "First 2-byte character" },
      { char: '\u07FF', codepoint: 2047, description: "Last 2-byte character" },

      { char: '中', codepoint: 20013, description: "Chinese character (center)" },
      { char: '文', codepoint: 25991, description: "Chinese character (text)" },
      { char: '你', codepoint: 20320, description: "Chinese character (you)" },
      { char: '好', codepoint: 22909, description: "Chinese character (good)" },
      { char: 'あ', codepoint: 12354, description: "Japanese hiragana A" },
      { char: 'か', codepoint: 12363, description: "Japanese hiragana KA" },
      { char: '한', codepoint: 54620, description: "Korean hangul HAN" },
      { char: '€', codepoint: 8364, description: "Euro symbol" },
      { char: '\u0800', codepoint: 2048, description: "First 3-byte character" },
      { char: '\uFFFF', codepoint: 65535, description: "Last 3-byte character" },

      { char: '🚀', codepoint: 128640, description: "Rocket emoji" },
      { char: '😀', codepoint: 128512, description: "Grinning face emoji" },
      { char: '🌍', codepoint: 127757, description: "Earth emoji" },
      { char: '💻', codepoint: 128187, description: "Laptop emoji" },
      { char: '🎉', codepoint: 127881, description: "Party emoji" },
      { char: '\u{10000}', codepoint: 65536, description: "First 4-byte character" },
      { char: '\u{10FFFF}', codepoint: 1114111, description: "Last valid Unicode character" },

      { codepoint: 0, description: "Minimum codepoint" },
      { codepoint: 127, description: "Maximum 1-byte" },
      { codepoint: 128, description: "Minimum 2-byte" },
      { codepoint: 2047, description: "Maximum 2-byte" },
      { codepoint: 2048, description: "Minimum 3-byte" },
      { codepoint: 65535, description: "Maximum 3-byte" },
      { codepoint: 65536, description: "Minimum 4-byte" },
      { codepoint: 1114111, description: "Maximum valid Unicode" }
    ];

    testCases.forEach((testCase) => {
      it(`should correctly encode ${testCase.description} (U+${testCase.codepoint.toString(16).toUpperCase()})`, async () => {
        circuit.expectPass({ codepoint: testCase.codepoint }, encodeUTF8(testCase.codepoint));
      });
    });
  });
});