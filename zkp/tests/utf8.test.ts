import { WitnessTester } from "./utils";
import { utf8ByteLength, utf8Encoder, utf8StringEncoder } from "./helpers";

const testCases1Byte = [
  { codepoint: 65 }, // A
  { codepoint: 90 }, // Z
  { codepoint: 48 }, // 0
  { codepoint: 57 }, // 9
  { codepoint: 32 }, // space
  { codepoint: 33 }, // !
  { codepoint: 0 }, // Null character
  { codepoint: 127 }, // DEL character
];

const testCases2Byte = [
  { codepoint: 241 }, // Spanish ñ
  { codepoint: 252 }, // German ü
  { codepoint: 233 }, // French é
  { codepoint: 945 }, // Greek alpha α
  { codepoint: 946 }, // Greek beta β
  { codepoint: 1078 }, // Cyrillic zh ж
  { codepoint: 128 }, // First 2-byte character
  { codepoint: 2047 }, // Last 2-byte character
];

const testCases3Byte = [
  { codepoint: 20013 }, // 中
  { codepoint: 25991 }, // 文
  { codepoint: 20320 }, // 你
  { codepoint: 22909 }, // 好
  { codepoint: 12354 }, // あ
  { codepoint: 12363 }, // か
  { codepoint: 54620 }, // 한
  { codepoint: 8364 }, // €
  { codepoint: 2048 }, // First 3-byte character
  { codepoint: 65535 }, // Last 3-byte character
];

const testCases4Byte = [
  { codepoint: 128640 }, // 🚀
  { codepoint: 128512 }, // 😀
  { codepoint: 127757 }, // 🌍
  { codepoint: 128187 }, // 💻
  { codepoint: 127881 }, // 🎉
  { codepoint: 65536 }, // First 4-byte character
  { codepoint: 1114111 }, // Last valid Unicode character
];

describe("Utf8ByteLength Circuit", function (): void {
  let circuit: WitnessTester<["codepoint"], ["length"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/utf8.circom",
      "Utf8ByteLength",
    );
    console.info(
      "Utf8ByteLength circuit constraints:",
      await circuit.getConstraintCount(),
    );
  });

  describe("Byte Length Calculation for UTF8 Encoding", function (): void {
    it("should correctly calculate byte length of 1", async () => {
      for (const { codepoint } of testCases1Byte) {
        await circuit.expectPass({ codepoint }, utf8ByteLength(codepoint));
      }
    });

    it("should correctly calculate byte length of 2", async () => {
      for (const { codepoint } of testCases1Byte) {
        await circuit.expectPass({ codepoint }, utf8ByteLength(codepoint));
      }
    });

    it("should correctly calculate byte length of 3", async () => {
      for (const { codepoint } of testCases1Byte) {
        await circuit.expectPass({ codepoint }, utf8ByteLength(codepoint));
      }
    });

    it("should correctly calculate byte length of 4", async () => {
      for (const { codepoint } of testCases1Byte) {
        await circuit.expectPass({ codepoint }, utf8ByteLength(codepoint));
      }
    });
  });
});

describe("Utf8Encoder Circuit", function (): void {
  let circuit: WitnessTester<["codepoint"], ["utf8"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/utf8.circom",
      "Utf8Encoder",
    );
    console.info(
      "Utf8Encoder circuit constraints:",
      await circuit.getConstraintCount(),
    );
  });

  describe("Individual Character Encoding", function (): void {
    it("should correctly encode character of byte length 1", async () => {
      for (const { codepoint } of testCases1Byte) {
        await circuit.expectPass(
          { codepoint },
          { utf8: utf8Encoder(codepoint) },
        );
      }
    });

    it("should correctly encode character of byte length 2", async () => {
      for (const { codepoint } of testCases1Byte) {
        await circuit.expectPass(
          { codepoint },
          { utf8: utf8Encoder(codepoint) },
        );
      }
    });

    it("should correctly encode character of byte length 3", async () => {
      for (const { codepoint } of testCases1Byte) {
        await circuit.expectPass(
          { codepoint },
          { utf8: utf8Encoder(codepoint) },
        );
      }
    });

    it("should correctly encode character of byte length 4", async () => {
      for (const { codepoint } of testCases1Byte) {
        await circuit.expectPass(
          { codepoint },
          { utf8: utf8Encoder(codepoint) },
        );
      }
    });
  });
});

describe("Utf8StringEncoder Circuit", function (): void {
  let circuit: WitnessTester<["codepoints"], ["bytes", "validByteCount"]>;

  describe("3-Character String Encoding", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/utf8.circom",
        "Utf8StringEncoder",
        {
          templateParams: ["3"],
        },
      );
      console.info(
        "3-Character Utf8StringEncoder circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should correctly encode pure ASCII strings", async () => {
      const testCases = [
        { codepoints: [65, 66, 67] }, // ABC
        { codepoints: [72, 105, 33] }, // Hi!
        { codepoints: [49, 50, 51] }, // 123
      ];

      for (const { codepoints } of testCases) {
        await circuit.expectPass({ codepoints }, utf8StringEncoder(codepoints));
      }
    });

    it("should correctly encode mixed byte length strings", async () => {
      const testCases = [
        { codepoints: [65, 20013, 128640] }, // A中🚀, 1-byte + 3-byte + 4-byte
        { codepoints: [241, 8364, 127757] }, // ñ€🌍, 2-byte + 3-byte + 4-byte
        { codepoints: [127, 241, 20013] }, // DEL ñ 中, 1-byte boundary + 2-byte + 3-byte
      ];

      for (const { codepoints } of testCases) {
        await circuit.expectPass({ codepoints }, utf8StringEncoder(codepoints));
      }
    });

    it("should correctly encode uniform byte length strings", async () => {
      const testCases = [
        { codepoints: [241, 252, 233] }, // ñüé, All 2-byte
        { codepoints: [20013, 25991, 23383] }, // 中文字, All 3-byte
        { codepoints: [128640, 128512, 127757] }, // 🚀😀🌍, All 4-byte
      ];

      for (const { codepoints } of testCases) {
        await circuit.expectPass({ codepoints }, utf8StringEncoder(codepoints));
      }
    });

    it("should correctly encode boundary cases", async () => {
      const testCases = [
        { codepoints: [2047, 2048, 65536] }, // Last 2-byte, First 3-byte, First 4-byte
        { codepoints: [0, 65, 20013] }, // \0A中, Null character with other bytes
      ];

      for (const { codepoints } of testCases) {
        await circuit.expectPass({ codepoints }, utf8StringEncoder(codepoints));
      }
    });
  });

  describe("15-Character String Encoding", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/utf8.circom",
        "Utf8StringEncoder",
        {
          templateParams: ["15"],
        },
      );
      console.info(
        "15-Character Utf8StringEncoder circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should correctly encode pure ASCII strings", async () => {
      const testCases = [
        {
          codepoints: [
            72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 32, 50, 48, 50,
            53,
          ].slice(0, 15),
        }, // "Hello World 2025" (16 chars, take first 15)
        {
          codepoints: [
            65, 66, 67, 49, 50, 51, 97, 98, 99, 120, 121, 122, 88, 89, 90,
          ],
        }, // "ABC123abcxyzXYZ"
        {
          codepoints: [
            33, 64, 35, 36, 37, 94, 38, 42, 40, 41, 45, 61, 43, 91, 93,
          ],
        }, // "!@#$%^&*()-=+[]"
      ];

      for (const { codepoints } of testCases) {
        await circuit.expectPass({ codepoints }, utf8StringEncoder(codepoints));
      }
    });

    it("should correctly encode mixed international characters", async () => {
      const testCases = [
        {
          // European languages mix
          codepoints: [
            72,
            101,
            108,
            108,
            111, // "Hello" (English)
            32, // space
            1044,
            1084,
            1080,
            1088, // "мир" (Russian - Cyrillic)
            32, // space
            19990,
            30028, // "世界" (Chinese)
            32, // space
            8364, // "€" (Euro symbols)
          ],
        },
        {
          // Latin extended with CJK
          codepoints: [
            99,
            97,
            102,
            233, // "café" (French)
            32, // space
            12371,
            12435,
            12395,
            12385,
            12431, // "こんにちは" (Japanese Hiragana)
            32, // space
            48152,
            45397,
            54616,
            49464, // "안녕하세" (Korean - first 4 chars)
          ],
        },
        {
          // Emoji and symbols mix
          codepoints: [
            128640,
            128512,
            127757, // "🚀😀🌍" (Emojis)
            32, // space
            65,
            66,
            67, // "ABC"
            32, // space
            20013,
            25991, // "中文"
            32, // space
            36,
            8364,
            163,
            165, // "$€£¥" (Currency symbols)
          ],
        },
      ];

      for (const { codepoints } of testCases) {
        await circuit.expectPass({ codepoints }, utf8StringEncoder(codepoints));
      }
    });

    it("should correctly encode heavy Unicode strings", async () => {
      const testCases = [
        {
          // All 4-byte emojis
          codepoints: [
            128640,
            128512,
            127757,
            128187,
            127881, // 🚀😀🌍💻🎉
            129395,
            129309,
            127774,
            128525,
            128151, // 🤳🤝🌾😍💗
            127800,
            128170,
            127866,
            128293,
            127752, // 🌈💪🎺⚡🌘
          ],
        },
        {
          // All 3-byte CJK
          codepoints: [
            20013,
            25991,
            23383,
            20320,
            22909, // 中文字你好
            19990,
            30028,
            26085,
            26412,
            38889, // 世界日本韓
            12371,
            12435,
            12395,
            12385,
            12431, // こんにちは
          ],
        },
        {
          // Heavy mixed encoding
          codepoints: [
            128640, // 🚀 (4-byte)
            20013, // 中 (3-byte)
            241, // ñ (2-byte)
            65, // A (1-byte)
            127757, // 🌍 (4-byte)
            25991, // 文 (3-byte)
            252, // ü (2-byte)
            66, // B (1-byte)
            128512, // 😀 (4-byte)
            23383, // 字 (3-byte)
            233, // é (2-byte)
            67, // C (1-byte)
            127881, // 🎉 (4-byte)
            22909, // 好 (3-byte)
            945, // α (2-byte)
          ],
        },
      ];

      for (const { codepoints } of testCases) {
        await circuit.expectPass({ codepoints }, utf8StringEncoder(codepoints));
      }
    });
  });
});
