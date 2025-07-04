import { WitnessTester } from "./utils";

describe("Base64GroupDecoder Cicuit", function () {
  let circuit: WitnessTester<["base64s"], ["bytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "./shared/components/base64GroupDecoder.circom",
    );
    console.info("Base64GroupDecoder circuit constraints:", await circuit.getConstraintCount());
  });

  describe("Valid Padding", function (): void {
    test("should accpet two padding", async function (): Promise<void> {
      const testCases = [
        { base64s: [16, 16, 64, 64], bytes: [65, 0, 0] },  // QQ== -> A
        { base64s: [26, 26, 64, 64], bytes: [105, 0, 0] }, // aa== -> i
        { base64s: [26, 31, 64, 64], bytes: [105, 0, 0] }, // af== -> i
        { base64s: [26, 32, 64, 64], bytes: [106, 0, 0] }, // ag== -> j
        { base64s: [28, 27, 64, 64], bytes: [113, 0, 0] }, // cb== -> q
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ base64s: testCase.base64s }, { bytes: testCase.bytes });
      };
    });

    test("should accpet one padding", async function (): Promise<void> {
      const testCases = [
        { base64s: [16, 36, 12, 64], bytes: [66, 67, 0] },  // QkM= -> BC
        { base64s: [19, 22, 21, 64], bytes: [77, 101, 0] }, // TWV= -> Me
        { base64s: [26, 39, 53, 64], bytes: [106, 125, 0] }, // an1= -> j}
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ base64s: testCase.base64s }, { bytes: testCase.bytes });
      };
    });

    test("should accpet no padding", async function (): Promise<void> {
      const testCases = [
        { base64s: [19, 22, 5, 46], bytes: [77, 97, 110] },    // TWFu -> Man
        { base64s: [29, 6, 33, 37], bytes: [116, 104, 101] },  // dGhl -> the
        { base64s: [16, 23, 9, 37], bytes: [65, 114, 101] },   // QXJl -> Are
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ base64s: testCase.base64s }, { bytes: testCase.bytes });
      };
    });
  });

  describe("Invalid Padding", function (): void {
    test("should reject padding in position 0 or 1", async function (): Promise<void> {
      const testCases = [
        { base64s: [64, 22, 5, 46] },
        { base64s: [64, 64, 33, 34] },
        { base64s: [16, 64, 9, 37] },
        { base64s: [64, 5, 64, 1] },
        { base64s: [64, 64, 18, 1] },
        { base64s: [37, 64, 18, 64] },
        { base64s: [31, 64, 64, 64] },
        { base64s: [64, 64, 64, 64] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      };
    });

    test("should reject one padding in position 2", async function (): Promise<void> {
      const testCases = [
        { base64s: [29, 6, 64, 34] },
        { base64s: [16, 23, 64, 37] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      };
    });
  });

  describe("Range Validation", function (): void {
    test("should handle boundary base64s correctly", async function (): Promise<void> {
      const testCases = [
        { base64s: [0, 0, 0, 0], bytes: [0, 0, 0] },
        { base64s: [0, 0, 63, 63], bytes: [0, 15, 255] },
        { base64s: [63, 0, 63, 0], bytes: [252, 15, 192] },
        { base64s: [63, 63, 63, 63], bytes: [255, 255, 255] },
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ base64s: testCase.base64s }, { bytes: testCase.bytes });
      };
    });

    test("should handle out-of-range base64s correctly", async function (): Promise<void> {
      const testCases = [
        { base64s: [100, 50, 25, 12] },
        { base64s: [20, 65, 20, 20] },
        { base64s: [35, 1, 255, 55] },
        { base64s: [30, 40, 50, 65] },
        { base64s: [65, 1, 1, 64] },
        { base64s: [128, 5, 64, 64] },
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      };
    });
  });

  // describe("Constraint Count Validation", function (): void {
  //   test("should report constraint counts", async function (): Promise<void> {
  //     console.info("Base64GroupDecoder constraints:", await circuit.getConstraintCount());
  //   });
  // });
});