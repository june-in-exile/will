import { WitnessTester } from "./utils";

describe("Base64GroupDecoder Cicuit", function () {
  let circuit: WitnessTester<["values"], ["bytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "./shared/components/base64GroupDecoder.circom",
    );
  });

  describe("Valid Padding", function (): void {
    test("should accpet two padding", async function (): Promise<void> {
      const testCases = [
        { values: [16, 16, 64, 64], bytes: [65, 0, 0] },  // QQ== -> A
        { values: [26, 26, 64, 64], bytes: [105, 0, 0] }, // aa== -> i
        { values: [26, 31, 64, 64], bytes: [105, 0, 0] }, // af== -> i
        { values: [26, 32, 64, 64], bytes: [106, 0, 0] }, // ag== -> j
        { values: [28, 27, 64, 64], bytes: [113, 0, 0] }, // cb== -> q
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ values: testCase.values }, { bytes: testCase.bytes });
      };
    });

    test("should accpet one padding", async function (): Promise<void> {
      const testCases = [
        { values: [16, 36, 12, 64], bytes: [66, 67, 0] },  // QkM= -> BC
        { values: [19, 22, 21, 64], bytes: [77, 101, 0] }, // TWV= -> Me
        { values: [26, 39, 53, 64], bytes: [106, 125, 0] }, // an1= -> j}
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ values: testCase.values }, { bytes: testCase.bytes });
      };
    });

    test("should accpet no padding", async function (): Promise<void> {
      const testCases = [
        { values: [19, 22, 5, 46], bytes: [77, 97, 110] },    // TWFu -> Men
        { values: [29, 6, 33, 37], bytes: [116, 104, 101] },  // dGhl -> the
        { values: [16, 23, 9, 37], bytes: [65, 114, 101] },   // QXJl -> Are
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ values: testCase.values }, { bytes: testCase.bytes });
      };
    });
  });

  describe("Invalid Padding", function (): void {
    test("should reject padding in position 0 or 1", async function (): Promise<void> {
      const testCases = [
        { values: [64, 22, 5, 46] },
        { values: [64, 64, 33, 34] },
        { values: [16, 64, 9, 37] },
        { values: [64, 5, 64, 1] },
        { values: [64, 64, 18, 1] },
        { values: [37, 64, 18, 64] },
        { values: [31, 64, 64, 64] },
        { values: [64, 64, 64, 64] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      };
    });

    test("should reject one padding in position 2", async function (): Promise<void> {
      const testCases = [
        { values: [29, 6, 64, 34] },
        { values: [16, 23, 64, 37] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      };
    });
  });

  describe("Range Validation", function (): void {
    test("should handle boundary values correctly", async function (): Promise<void> {
      const testCases = [
        { values: [0, 0, 0, 0], bytes: [0, 0, 0] },
        { values: [0, 0, 63, 63], bytes: [0, 15, 255] },
        { values: [63, 0, 63, 0], bytes: [252, 15, 192] },
        { values: [63, 63, 63, 63], bytes: [255, 255, 255] },
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ values: testCase.values }, { bytes: testCase.bytes });
      };
    });

    test("should handle out-of-range values correctly", async function (): Promise<void> {
      const testCases = [
        { values: [100, 50, 25, 12] },
        { values: [20, 65, 20, 20] },
        { values: [35, 1, 255, 55] },
        { values: [30, 40, 50, 65] },
        { values: [65, 1, 1, 64] },
        { values: [128, 5, 64, 64] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      };
    });
  });
});