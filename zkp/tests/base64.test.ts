import { Base64, Ascii, Bit } from "./type/index.js";
import { WitnessTester } from "./util/index.js";

describe("Base64Char Circuit", function () {
  let circuit: WitnessTester<["ascii"], ["base64"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/base64.circom",
      "Base64Char",
    );
    circuit.setConstraint("base64 character");
  });

  describe("Complete Base64 Character Set", function (): void {
    it("should handle all valid Base64 characters", async function (): Promise<void> {
      const base64Chars: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

      for (let i = 0; i < base64Chars.length; i++) {
        const char: string = base64Chars[i];
        const ascii: number = char.charCodeAt(0);
        const base64: number = i;

        await circuit.expectPass({ ascii }, { base64 });
      }
    });
  });

  describe("Invalid Base64 Characters", function (): void {
    it("should handle invalid characters", async function (): Promise<void> {
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

      for (const ascii of invalidChars) {
        await circuit.expectFail({ ascii });
      }
    });

    it("should handle characters adjacent to valid range", async function (): Promise<void> {
      const adjacentInvalid = [
        46, // '/' 's previous character ('.')
        58, // '9' 's next character (':')
        64, // 'A' 's previous character ('@')
        91, // 'Z' 's next character ('[')
        96, // 'a' 's previous character ('`')
        123, // 'z' 's next character ('{')
      ];

      for (const ascii of adjacentInvalid) {
        await circuit.expectFail({ ascii });
      }
    });
  });
});

describe("Base64CharExcludingPadding Circuit", function () {
  let circuit: WitnessTester<["ascii"], ["base64"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/base64.circom",
      "Base64CharExcludingPadding",
    );
    circuit.setConstraint("base64 character excluding padding");
  });

  describe("Complete Base64 Character Set", function (): void {
    it("should handle all Base64 non-padding characters", async function (): Promise<void> {
      const base64Chars: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

      for (let i = 0; i < base64Chars.length; i++) {
        const char: string = base64Chars[i];
        const ascii: Ascii = char.charCodeAt(0) as Ascii;
        const base64: Base64 = i as Base64;

        await circuit.expectPass({ ascii }, { base64 });
      }
    });

    it("should reject Base64 padding characters", async function (): Promise<void> {
      const char: string = "=";
      const ascii: Ascii = char.charCodeAt(0) as Ascii;

      await circuit.expectFail({ ascii });
    });
  });

  describe("Invalid Base64 Characters", function (): void {
    it("should reject invalid characters", async function (): Promise<void> {
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

      for (const ascii of invalidChars) {
        await circuit.expectFail({ ascii });
      }
    });

    it("should reject characters adjacent to valid range", async function (): Promise<void> {
      const adjacentInvalid = [
        46, // '/' 's previous character ('.')
        58, // '9' 's next character (':')
        64, // 'A' 's previous character ('@')
        91, // 'Z' 's next character ('[')
        96, // 'a' 's previous character ('`')
        123, // 'z' 's next character ('{')
      ];

      for (const ascii of adjacentInvalid) {
        await circuit.expectFail({ ascii });
      }
    });
  });
});

describe("Base64CharWithPaddingDetector Circuit", function () {
  let circuit: WitnessTester<["ascii"], ["base64", "isPadding"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/base64.circom",
      "Base64CharWithPaddingDetector",
    );
    circuit.setConstraint("base64 character with padding detector");
  });

  describe("Complete Base64 Character Set", function (): void {
    it("should handle all Base64 non-padding characters", async function (): Promise<void> {
      const base64Chars: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

      for (let i = 0; i < base64Chars.length; i++) {
        const char: string = base64Chars[i];
        const ascii: Ascii = char.charCodeAt(0) as Ascii;
        const base64: Base64 = i as Base64;
        const isPadding: Bit = 0;

        await circuit.expectPass({ ascii }, { base64, isPadding });
      }
    });

    it("should handle Base64 padding characters", async function (): Promise<void> {
      const char: string = "=";
      const ascii: Ascii = char.charCodeAt(0) as Ascii;
      const base64: Base64 = 0 as Base64;
      const isPadding: Bit = 1;

      await circuit.expectPass({ ascii }, { base64, isPadding });
    });
  });

  describe("Invalid Base64 Characters", function (): void {
    it("should reject invalid characters", async function (): Promise<void> {
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

      for (const ascii of invalidChars) {
        await circuit.expectFail({ ascii });
      }
    });

    it("should reject characters adjacent to valid range", async function (): Promise<void> {
      const adjacentInvalid = [
        46, // '/' 's previous character ('.')
        58, // '9' 's next character (':')
        64, // 'A' 's previous character ('@')
        91, // 'Z' 's next character ('[')
        96, // 'a' 's previous character ('`')
        123, // 'z' 's next character ('{')
      ];

      for (const ascii of adjacentInvalid) {
        await circuit.expectFail({ ascii });
      }
    });
  });
});

describe("Base64GroupDecoder Circuit", function () {
  let circuit: WitnessTester<["base64Group"], ["bytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/base64.circom",
      "Base64GroupDecoder",
    );
    circuit.setConstraint("base64 group decoder");
  });

  describe("Valid Padding", function (): void {
    it("should accpet two padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [16, 16, 64, 64], bytes: [65, 0, 0] }, // QQ== -> A
        { base64Group: [26, 26, 64, 64], bytes: [105, 0, 0] }, // aa== -> i
        { base64Group: [26, 31, 64, 64], bytes: [105, 0, 0] }, // af== -> i
        { base64Group: [26, 32, 64, 64], bytes: [106, 0, 0] }, // ag== -> j
        { base64Group: [28, 27, 64, 64], bytes: [113, 0, 0] }, // cb== -> q
      ];

      for (const { base64Group, bytes } of testCases) {
        await circuit.expectPass(
          { base64Group: base64Group },
          { bytes: bytes },
        );
      }
    });

    it("should accpet one padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [16, 36, 12, 64], bytes: [66, 67, 0] }, // QkM= -> BC
        { base64Group: [19, 22, 21, 64], bytes: [77, 101, 0] }, // TWV= -> Me
        { base64Group: [26, 39, 53, 64], bytes: [106, 125, 0] }, // an1= -> j}
      ];

      for (const { base64Group, bytes } of testCases) {
        await circuit.expectPass(
          { base64Group: base64Group },
          { bytes: bytes },
        );
      }
    });

    it("should accpet no padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [19, 22, 5, 46], bytes: [77, 97, 110] }, // TWFu -> Man
        { base64Group: [29, 6, 33, 37], bytes: [116, 104, 101] }, // dGhl -> the
        { base64Group: [16, 23, 9, 37], bytes: [65, 114, 101] }, // QXJl -> Are
      ];

      for (const { base64Group, bytes } of testCases) {
        await circuit.expectPass(
          { base64Group: base64Group },
          { bytes: bytes },
        );
      }
    });
  });

  describe("Invalid Padding", function (): void {
    it("should reject padding in position 0 or 1", async function (): Promise<void> {
      const testCases = [
        { base64Group: [64, 22, 5, 46] },
        { base64Group: [64, 64, 33, 34] },
        { base64Group: [16, 64, 9, 37] },
        { base64Group: [64, 5, 64, 1] },
        { base64Group: [64, 64, 18, 1] },
        { base64Group: [37, 64, 18, 64] },
        { base64Group: [31, 64, 64, 64] },
        { base64Group: [64, 64, 64, 64] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });

    it("should reject one padding in position 2", async function (): Promise<void> {
      const testCases = [
        { base64Group: [29, 6, 64, 34] },
        { base64Group: [16, 23, 64, 37] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("Range Validation", function (): void {
    it("should handle boundary base64Group correctly", async function (): Promise<void> {
      const testCases = [
        { base64Group: [0, 0, 0, 0], bytes: [0, 0, 0] },
        { base64Group: [0, 0, 63, 63], bytes: [0, 15, 255] },
        { base64Group: [63, 0, 63, 0], bytes: [252, 15, 192] },
        { base64Group: [63, 63, 63, 63], bytes: [255, 255, 255] },
      ];

      for (const { base64Group, bytes } of testCases) {
        await circuit.expectPass(
          { base64Group: base64Group },
          { bytes: bytes },
        );
      }
    });

    it("should handle out-of-range base64Group correctly", async function (): Promise<void> {
      const testCases = [
        { base64Group: [100, 50, 25, 12] },
        // { base64Group: [20, 65, 20, 20] },
        // { base64Group: [35, 1, 255, 55] },
        // { base64Group: [30, 40, 50, 65] },
        // { base64Group: [65, 1, 1, 64] },
        // { base64Group: [128, 5, 64, 64] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});

describe("Base64GroupDecoderWithoutPadding Circuit", function () {
  let circuit: WitnessTester<["base64Group"], ["bytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/base64.circom",
      "Base64GroupDecoderWithoutPadding",
    );
    circuit.setConstraint("base64 group decoder without padding");
  });

  describe("No Padding", function (): void {
    it("should accpet no padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [19, 22, 5, 46], bytes: [77, 97, 110] }, // TWFu -> Man
        { base64Group: [29, 6, 33, 37], bytes: [116, 104, 101] }, // dGhl -> the
        { base64Group: [16, 23, 9, 37], bytes: [65, 114, 101] }, // QXJl -> Are
      ];

      for (const { base64Group, bytes } of testCases) {
        await circuit.expectPass(
          { base64Group: base64Group },
          { bytes: bytes },
        );
      }
    });
  });

  describe("Range Validation", function (): void {
    it("should handle boundary base64Group correctly", async function (): Promise<void> {
      const testCases = [
        { base64Group: [0, 0, 0, 0], bytes: [0, 0, 0] },
        { base64Group: [0, 0, 63, 63], bytes: [0, 15, 255] },
        { base64Group: [63, 0, 63, 0], bytes: [252, 15, 192] },
        { base64Group: [63, 63, 63, 63], bytes: [255, 255, 255] },
      ];

      for (const { base64Group, bytes } of testCases) {
        await circuit.expectPass(
          { base64Group: base64Group },
          { bytes: bytes },
        );
      }
    });

    it("should reject out-of-range base64Group", async function (): Promise<void> {
      const testCases = [
        { base64Group: [100, 50, 25, 12] },
        { base64Group: [20, 65, 20, 20] },
        { base64Group: [35, 1, 255, 55] },
        { base64Group: [30, 40, 50, 65] },
        { base64Group: [65, 1, 1, 0] },
        { base64Group: [128, 5, 0, 0] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});

describe("Base64GroupDecoderWithPadding Circuit", function () {
  let circuit: WitnessTester<["base64Group", "isPadding"], ["bytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/base64.circom",
      "Base64GroupDecoderWithPadding",
    );
    circuit.setConstraint("base64 group decoder with padding");
  });

  describe("Valid Padding", function (): void {
    it("should accpet two padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [16, 16, 0, 0], isPadding: [1, 1], bytes: [65, 0, 0] }, // QQ== -> A
        { base64Group: [26, 26, 0, 0], isPadding: [1, 1], bytes: [105, 0, 0] }, // aa== -> i
        { base64Group: [26, 31, 0, 0], isPadding: [1, 1], bytes: [105, 0, 0] }, // af== -> i
        { base64Group: [26, 32, 0, 0], isPadding: [1, 1], bytes: [106, 0, 0] }, // ag== -> j
        { base64Group: [28, 27, 0, 0], isPadding: [1, 1], bytes: [113, 0, 0] }, // cb== -> q
      ];

      for (const { base64Group, isPadding, bytes } of testCases) {
        await circuit.expectPass({ base64Group, isPadding }, { bytes });
      }
    });

    it("should accpet one padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [16, 36, 12, 0], isPadding: [0, 1], bytes: [66, 67, 0] }, // QkM= -> BC
        {
          base64Group: [19, 22, 21, 0],
          isPadding: [0, 1],
          bytes: [77, 101, 0],
        }, // TWV= -> Me
        {
          base64Group: [26, 39, 53, 0],
          isPadding: [0, 1],
          bytes: [106, 125, 0],
        }, // an1= -> j}
      ];

      for (const { base64Group, isPadding, bytes } of testCases) {
        await circuit.expectPass({ base64Group, isPadding }, { bytes });
      }
    });

    it("should accpet no padding", async function (): Promise<void> {
      const testCases = [
        {
          base64Group: [19, 22, 5, 46],
          isPadding: [0, 0],
          bytes: [77, 97, 110],
        }, // TWFu -> Man
        {
          base64Group: [29, 6, 33, 37],
          isPadding: [0, 0],
          bytes: [116, 104, 101],
        }, // dGhl -> the
        {
          base64Group: [16, 23, 9, 37],
          isPadding: [0, 0],
          bytes: [65, 114, 101],
        }, // QXJl -> Are
      ];

      for (const { base64Group, isPadding, bytes } of testCases) {
        await circuit.expectPass({ base64Group, isPadding }, { bytes });
      }
    });
  });

  describe("Invalid Padding", function (): void {
    it("should reject one padding in position 2", async function (): Promise<void> {
      const testCases = [
        { base64Group: [29, 6, 0, 34], isPadding: [1, 0] },
        { base64Group: [16, 23, 0, 37], isPadding: [1, 0] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("Range Validation", function (): void {
    it("should handle boundary base64Group correctly", async function (): Promise<void> {
      const testCases = [
        { base64Group: [0, 0, 0, 0], isPadding: [0, 0], bytes: [0, 0, 0] },
        { base64Group: [0, 0, 63, 63], isPadding: [0, 0], bytes: [0, 15, 255] },
        {
          base64Group: [63, 0, 63, 0],
          isPadding: [0, 0],
          bytes: [252, 15, 192],
        },
        {
          base64Group: [63, 63, 63, 63],
          isPadding: [0, 0],
          bytes: [255, 255, 255],
        },
      ];

      for (const { base64Group, isPadding, bytes } of testCases) {
        await circuit.expectPass({ base64Group, isPadding }, { bytes });
      }
    });

    it("should handle out-of-range base64Group correctly", async function (): Promise<void> {
      const testCases = [
        { base64Group: [100, 50, 25, 12], isPadding: [0, 0] },
        { base64Group: [20, 65, 20, 20], isPadding: [0, 0] },
        { base64Group: [35, 1, 255, 55], isPadding: [0, 0] },
        { base64Group: [30, 40, 50, 65], isPadding: [0, 0] },
        { base64Group: [65, 1, 1, 0], isPadding: [0, 1] },
        { base64Group: [128, 5, 0, 0], isPadding: [1, 1] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});

describe("Base64Decoder Circuit", function () {
  let circuit: WitnessTester<["asciis"], ["bytes"]>;

  describe("4-byte Base64Decoder", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/base64.circom",
        "Base64Decoder",
        {
          templateParams: ["4"],
        },
      );
      circuit.setConstraint("4-byte base64 decoder");
    });

    it("should decode no-padding 'TWFu' into 'Man'", async function (): Promise<void> {
      const asciis = [84, 87, 70, 117];
      const bytes = [77, 97, 110];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should decode 1-padding 'QkM=' into 'BC'", async function (): Promise<void> {
      const asciis = [81, 107, 77, 61];
      const bytes = [66, 67, 0];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should decode 2-padding 'QQ==' into 'A'", async function (): Promise<void> {
      const asciis = [81, 81, 61, 61];
      const bytes = [65, 0, 0];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should decode null byte 'AA==' to 0x00", async function (): Promise<void> {
      const asciis = [65, 65, 61, 61];
      const bytes = [0];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should decode max byte '/w==' to 0xFF", async function (): Promise<void> {
      const asciis = [47, 119, 61, 61];
      const bytes = [255];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should decode with + and / characters '+/8='", async function (): Promise<void> {
      const asciis = [43, 47, 56, 61];
      const bytes = [251, 255];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should decode uppercase and lowercase mix 'AaAa'", async function (): Promise<void> {
      const asciis = [65, 97, 65, 97];
      const bytes = [1, 160, 26];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should not decode invalid padding patterns", async function (): Promise<void> {
      const testCases = [
        { asciis: [84, 61, 61, 61] }, // T===
        { asciis: [61, 86, 61, 61] }, // =V==
        { asciis: [61, 61, 107, 110] }, // ==kn
        { asciis: [97, 61, 70, 98] }, // a=Fb
        { asciis: [61, 57, 80, 113] }, // =9Pq
        { asciis: [47, 119, 61, 49] }, // w=1
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("8-byte Base64Decoder", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/base64.circom",
        "Base64Decoder",
        {
          templateParams: ["8"],
        },
      );
      circuit.setConstraint("8-byte base64 decoder");
    });

    it("should decode no-padding 'Tm8gd2F5' into 'No way'", async function (): Promise<void> {
      const asciis = [84, 109, 56, 103, 100, 50, 70, 53];
      const bytes = [78, 111, 32, 119, 97, 121];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should decode 1-padding 'SGVsbG8=' into 'Hello'", async function (): Promise<void> {
      const asciis = [83, 71, 86, 115, 98, 71, 56, 61];
      const bytes = [72, 101, 108, 108, 111];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should decode 2-padding 'Q29vbA==' into 'Cool'", async function (): Promise<void> {
      const asciis = [81, 50, 57, 118, 98, 65, 61, 61];
      const bytes = [67, 111, 111, 108];
      await circuit.expectPass({ asciis }, { bytes });
    });

    it("should not decode padding before last base64 group", async function (): Promise<void> {
      const testCases = [
        { asciis: [61, 57, 80, 113, 81, 50, 57, 118] }, // =9PqQ29v
        { asciis: [85, 61, 107, 110, 83, 71, 86, 115] }, // U=knSGVs
        { asciis: [84, 86, 61, 61, 98, 71, 56, 61] }, // TV==bG8=
        { asciis: [98, 71, 56, 61, 100, 50, 70, 53] }, // bG8=d2F5
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("360-byte Base64Decoder", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/base64.circom",
        "Base64Decoder",
        {
          templateParams: ["360"],
        },
      );
      circuit.setConstraint("360-byte base64 decoder");
    });

    it("should decode a real world case", async function (): Promise<void> {
      // Source: https://zh.wikipedia.org/zh-tw/Base64
      // TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltYWxzLCB3aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFuY2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGludWVkIGFuZCBpbmRlZmF0aWdhYmxlIGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRoZSBzaG9ydCB2ZWhlbWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=
      const asciis = [
        84, 87, 70, 117, 73, 71, 108, 122, 73, 71, 82, 112, 99, 51, 82, 112, 98,
        109, 100, 49, 97, 88, 78, 111, 90, 87, 81, 115, 73, 71, 53, 118, 100,
        67, 66, 118, 98, 109, 120, 53, 73, 71, 74, 53, 73, 71, 104, 112, 99,
        121, 66, 121, 90, 87, 70, 122, 98, 50, 52, 115, 73, 71, 74, 49, 100, 67,
        66, 105, 101, 83, 66, 48, 97, 71, 108, 122, 73, 72, 78, 112, 98, 109,
        100, 49, 98, 71, 70, 121, 73, 72, 66, 104, 99, 51, 78, 112, 98, 50, 52,
        103, 90, 110, 74, 118, 98, 83, 66, 118, 100, 71, 104, 108, 99, 105, 66,
        104, 98, 109, 108, 116, 89, 87, 120, 122, 76, 67, 66, 51, 97, 71, 108,
        106, 97, 67, 66, 112, 99, 121, 66, 104, 73, 71, 120, 49, 99, 51, 81,
        103, 98, 50, 89, 103, 100, 71, 104, 108, 73, 71, 49, 112, 98, 109, 81,
        115, 73, 72, 82, 111, 89, 88, 81, 103, 89, 110, 107, 103, 89, 83, 66,
        119, 90, 88, 74, 122, 90, 88, 90, 108, 99, 109, 70, 117, 89, 50, 85,
        103, 98, 50, 89, 103, 90, 71, 86, 115, 97, 87, 100, 111, 100, 67, 66,
        112, 98, 105, 66, 48, 97, 71, 85, 103, 89, 50, 57, 117, 100, 71, 108,
        117, 100, 87, 86, 107, 73, 71, 70, 117, 90, 67, 66, 112, 98, 109, 82,
        108, 90, 109, 70, 48, 97, 87, 100, 104, 89, 109, 120, 108, 73, 71, 100,
        108, 98, 109, 86, 121, 89, 88, 82, 112, 98, 50, 52, 103, 98, 50, 89,
        103, 97, 50, 53, 118, 100, 50, 120, 108, 90, 71, 100, 108, 76, 67, 66,
        108, 101, 71, 78, 108, 90, 87, 82, 122, 73, 72, 82, 111, 90, 83, 66,
        122, 97, 71, 57, 121, 100, 67, 66, 50, 90, 87, 104, 108, 98, 87, 86,
        117, 89, 50, 85, 103, 98, 50, 89, 103, 89, 87, 53, 53, 73, 71, 78, 104,
        99, 109, 53, 104, 98, 67, 66, 119, 98, 71, 86, 104, 99, 51, 86, 121, 90,
        83, 52, 61,
      ];
      // Man is distinguished, not only by his reason, but by this singular passion from other animals, which is a lust of the mind, that by a perseverance of delight in the continued and indefatigable generation of knowledge, exceeds the short vehemence of any carnal pleasure.
      const bytes = [
        77, 97, 110, 32, 105, 115, 32, 100, 105, 115, 116, 105, 110, 103, 117,
        105, 115, 104, 101, 100, 44, 32, 110, 111, 116, 32, 111, 110, 108, 121,
        32, 98, 121, 32, 104, 105, 115, 32, 114, 101, 97, 115, 111, 110, 44, 32,
        98, 117, 116, 32, 98, 121, 32, 116, 104, 105, 115, 32, 115, 105, 110,
        103, 117, 108, 97, 114, 32, 112, 97, 115, 115, 105, 111, 110, 32, 102,
        114, 111, 109, 32, 111, 116, 104, 101, 114, 32, 97, 110, 105, 109, 97,
        108, 115, 44, 32, 119, 104, 105, 99, 104, 32, 105, 115, 32, 97, 32, 108,
        117, 115, 116, 32, 111, 102, 32, 116, 104, 101, 32, 109, 105, 110, 100,
        44, 32, 116, 104, 97, 116, 32, 98, 121, 32, 97, 32, 112, 101, 114, 115,
        101, 118, 101, 114, 97, 110, 99, 101, 32, 111, 102, 32, 100, 101, 108,
        105, 103, 104, 116, 32, 105, 110, 32, 116, 104, 101, 32, 99, 111, 110,
        116, 105, 110, 117, 101, 100, 32, 97, 110, 100, 32, 105, 110, 100, 101,
        102, 97, 116, 105, 103, 97, 98, 108, 101, 32, 103, 101, 110, 101, 114,
        97, 116, 105, 111, 110, 32, 111, 102, 32, 107, 110, 111, 119, 108, 101,
        100, 103, 101, 44, 32, 101, 120, 99, 101, 101, 100, 115, 32, 116, 104,
        101, 32, 115, 104, 111, 114, 116, 32, 118, 101, 104, 101, 109, 101, 110,
        99, 101, 32, 111, 102, 32, 97, 110, 121, 32, 99, 97, 114, 110, 97, 108,
        32, 112, 108, 101, 97, 115, 117, 114, 101, 46,
      ];
      await circuit.expectPass({ asciis }, { bytes });
    });
  });
});
