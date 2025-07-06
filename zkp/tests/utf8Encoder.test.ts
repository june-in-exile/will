import { WitnessTester } from "./utils";
import { utf8ByteLength, encodeUTF8 } from "./utils/utf8Encoder";

const testCases1Byte = [
  { codepoint: 65 },  // A
  { codepoint: 90 },  // Z
  { codepoint: 48 },  // 0
  { codepoint: 57 },  // 9
  { codepoint: 32 },  // space
  { codepoint: 33 },  // !
  { codepoint: 0 },   // Null character
  { codepoint: 127 }, // DEL character
];
const testCases2Byte = [
  { codepoint: 241 },   // Spanish ñ
  { codepoint: 252 },   // German ü
  { codepoint: 233 },   // French é
  { codepoint: 945 },   // Greek alpha α
  { codepoint: 946 },   // Greek beta β
  { codepoint: 1078 },  // Cyrillic zh ж
  { codepoint: 128 },   // First 2-byte character
  { codepoint: 2047 },  // Last 2-byte character
];
const testCases3Byte = [
  { codepoint: 20013 }, // 中
  { codepoint: 25991 }, // 文
  { codepoint: 20320 }, // 你
  { codepoint: 22909 }, // 好
  { codepoint: 12354 }, // あ
  { codepoint: 12363 }, // か
  { codepoint: 54620 }, // 한
  { codepoint: 8364 },  // €
  { codepoint: 2048 },  // First 3-byte character
  { codepoint: 65535 }, // Last 3-byte character
];
const testCases4Byte = [
  { codepoint: 128640 },  // 🚀
  { codepoint: 128512 },  // 😀
  { codepoint: 127757 },  // 🌍
  { codepoint: 128187 },  // 💻
  { codepoint: 127881 },  // 🎉
  { codepoint: 65536 },   // First 4-byte character
  { codepoint: 1114111 }, // Last valid Unicode character
];

describe("Utf8ByteLength Circuit", function (): void {
  let circuit: WitnessTester<["codepoint"], ["length"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct("./shared/components/utf8Encoder.circom", "Utf8ByteLength");
    console.info("Utf8ByteLength circuit constraints:", await circuit.getConstraintCount());
  });

  describe("Byte Length Calculation for UTF8 Encoding", function (): void {
    it("should correctly calculate byte length of 1", async () => {
      for (const testCase of testCases1Byte) {
        await circuit.expectPass({ codepoint: testCase.codepoint }, utf8ByteLength(testCase.codepoint));
      };
    });

    it("should correctly calculate byte length of 2", async () => {
      for (const testCase of testCases2Byte) {
        await circuit.expectPass({ codepoint: testCase.codepoint }, utf8ByteLength(testCase.codepoint));
      };
    });

    it("should correctly calculate byte length of 3", async () => {
      for (const testCase of testCases3Byte) {
        await circuit.expectPass({ codepoint: testCase.codepoint }, utf8ByteLength(testCase.codepoint));
      };
    });

    it("should correctly calculate byte length of 4", async () => {
      for (const testCase of testCases4Byte) {
        await circuit.expectPass({ codepoint: testCase.codepoint }, utf8ByteLength(testCase.codepoint));
      };
    });
  });
});

describe("Utf8Encoder Circuit", function (): void {
  let circuit: WitnessTester<["codepoint"], ["bytes", "validBytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct("./shared/components/utf8Encoder.circom", "Utf8Encoder");
    console.info("Utf8Encoder circuit constraints:", await circuit.getConstraintCount());
  });

  describe("Individual Character Encoding", function (): void {
    it("should correctly encode character of byte length 1", async () => {
      for (const testCase of testCases1Byte) {
        await circuit.expectPass({ codepoint: testCase.codepoint }, encodeUTF8(testCase.codepoint));
      };
    });

    it("should correctly encode character of byte length 2", async () => {
      for (const testCase of testCases2Byte) {
        await circuit.expectPass({ codepoint: testCase.codepoint }, encodeUTF8(testCase.codepoint));
      };
    });

    it("should correctly encode character of byte length 3", async () => {
      for (const testCase of testCases3Byte) {
        await circuit.expectPass({ codepoint: testCase.codepoint }, encodeUTF8(testCase.codepoint));
      };
    });

    it("should correctly encode character of byte length 4", async () => {
      for (const testCase of testCases4Byte) {
        await circuit.expectPass({ codepoint: testCase.codepoint }, encodeUTF8(testCase.codepoint));
      };
    });
  });
});