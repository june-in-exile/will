import { WitnessTester } from "./utils";

describe("AsciiToBase64 Cicuit", function () {
  let circuit: WitnessTester<["ascii"], ["base64"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "./shared/components/base64.circom", {
      templateName: "AsciiToBase64",
    });
    console.info("AsciiToBase64 circuit constraints:", await circuit.getConstraintCount());
  });

  describe("Complete Base64 Character Set", function (): void {
    test("should handle all valid Base64 characters", async function (): Promise<void> {
      const base64Chars: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

      for (let i = 0; i < base64Chars.length; i++) {
        const char: string = base64Chars[i];
        const ascii: number = char.charCodeAt(0);
        const base64: number = i;

        await circuit.expectPass({ ascii }, { base64 });
      };
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

      for (const ascii of invalidChars) {
        await circuit.expectFail({ ascii });
      };
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

      for (const ascii of adjacentInvalid) {
        await circuit.expectFail({ ascii });
      };
    });
  });
});

describe("Base64GroupDecoder Cicuit", function () {
  let circuit: WitnessTester<["base64Group"], ["bytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "./shared/components/base64.circom", {
      templateName: "Base64GroupDecoder",
    });
    console.info("Base64GroupDecoder circuit constraints:", await circuit.getConstraintCount());
  });

  describe("Valid Padding", function (): void {
    test("should accpet two padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [16, 16, 64, 64], bytes: [65, 0, 0] },  // QQ== -> A
        { base64Group: [26, 26, 64, 64], bytes: [105, 0, 0] }, // aa== -> i
        { base64Group: [26, 31, 64, 64], bytes: [105, 0, 0] }, // af== -> i
        { base64Group: [26, 32, 64, 64], bytes: [106, 0, 0] }, // ag== -> j
        { base64Group: [28, 27, 64, 64], bytes: [113, 0, 0] }, // cb== -> q
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ base64Group: testCase.base64Group }, { bytes: testCase.bytes });
      };
    });

    test("should accpet one padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [16, 36, 12, 64], bytes: [66, 67, 0] },  // QkM= -> BC
        { base64Group: [19, 22, 21, 64], bytes: [77, 101, 0] }, // TWV= -> Me
        { base64Group: [26, 39, 53, 64], bytes: [106, 125, 0] }, // an1= -> j}
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ base64Group: testCase.base64Group }, { bytes: testCase.bytes });
      };
    });

    test("should accpet no padding", async function (): Promise<void> {
      const testCases = [
        { base64Group: [19, 22, 5, 46], bytes: [77, 97, 110] },    // TWFu -> Man
        { base64Group: [29, 6, 33, 37], bytes: [116, 104, 101] },  // dGhl -> the
        { base64Group: [16, 23, 9, 37], bytes: [65, 114, 101] },   // QXJl -> Are
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ base64Group: testCase.base64Group }, { bytes: testCase.bytes });
      };
    });
  });

  describe("Invalid Padding", function (): void {
    test("should reject padding in position 0 or 1", async function (): Promise<void> {
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
      };
    });

    test("should reject one padding in position 2", async function (): Promise<void> {
      const testCases = [
        { base64Group: [29, 6, 64, 34] },
        { base64Group: [16, 23, 64, 37] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      };
    });
  });

  describe("Range Validation", function (): void {
    test("should handle boundary base64Group correctly", async function (): Promise<void> {
      const testCases = [
        { base64Group: [0, 0, 0, 0], bytes: [0, 0, 0] },
        { base64Group: [0, 0, 63, 63], bytes: [0, 15, 255] },
        { base64Group: [63, 0, 63, 0], bytes: [252, 15, 192] },
        { base64Group: [63, 63, 63, 63], bytes: [255, 255, 255] },
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ base64Group: testCase.base64Group }, { bytes: testCase.bytes });
      };
    });

    test("should handle out-of-range base64Group correctly", async function (): Promise<void> {
      const testCases = [
        { base64Group: [100, 50, 25, 12] },
        { base64Group: [20, 65, 20, 20] },
        { base64Group: [35, 1, 255, 55] },
        { base64Group: [30, 40, 50, 65] },
        { base64Group: [65, 1, 1, 64] },
        { base64Group: [128, 5, 64, 64] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      };
    });
  });
});

describe("Base64Decoder Circuit", function () {
  let circuit: WitnessTester<["asciis"], ["bytes"]>;

  describe("Valid Padding", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct("./shared/components/base64.circom", {
        templateName: "Base64Decoder",
        templateParams: ["4"],
      });
      console.info("Base64Decoder circuit constraints:", await circuit.getConstraintCount());
    });

    test("should decode no-padding case 'TWFu' into 'Man'", async function (): Promise<void> {
      const asciis = [84, 87, 70, 117];
      const bytes = [77, 97, 110];
      await circuit.expectPass({ asciis }, { bytes });
    });

    test("should decode 1-padding case 'QkM=' into 'BC'", async function (): Promise<void> {
      const asciis = [81, 107, 77, 61];
      const bytes = [66, 67, 0];
      await circuit.expectPass({ asciis }, { bytes });
    });

    test("should decode 2-padding case 'QQ==' into 'A'", async function (): Promise<void> {
      const asciis = [81, 81, 61, 61];
      const bytes = [65, 0, 0];
      await circuit.expectPass({ asciis }, { bytes });
    });
  });

  describe("Invalid Padding", function (): void {
    test("should not decode invalid padding patterns", async function (): Promise<void> {
      const testCases = [
        { asciis: [84, 61, 61, 61] }, // T===
        { asciis: [61, 86, 61, 61] }, // =V==
        { asciis: [61, 61, 107, 110] }, // ==kn
        { asciis: [97, 61, 70, 98] }, // a=Fb
        { asciis: [61, 57, 80, 113] }, // =9Pq
      ];
     
      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});