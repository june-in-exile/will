import { WitnessTester } from "./utils";

describe("Mask Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("8-bit 0x0F Mask Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "./shared/components/bits.circom", {
        templateName: "Mask",
        templateParams: ["8", "15"],
      });
      console.info("8-bit 0x0F mask circuit constraints:", await circuit.getConstraintCount());
    });

    test("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },         // 0000 0000 & 0000 1111 = 0000 0000
        { in: 15, out: 15 },       // 0000 1111 & 0000 1111 = 0000 1111
        { in: 16, out: 0 },        // 0001 0000 & 0000 1111 = 0000 0000
        { in: 31, out: 15 },       // 0001 1111 & 0000 1111 = 0000 1111
        { in: 240, out: 0 },       // 1111 0000 & 0000 1111 = 0000 0000
        { in: 255, out: 15 },      // 1111 1111 & 0000 1111 = 0000 1111
        { in: 170, out: 10 },      // 1010 1010 & 0000 1111 = 0000 1010
        { in: 85, out: 5 },        // 0101 0101 & 0000 1111 = 0000 0101
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases8 = [
        { in: 0, out: 0 },
        { in: 255, out: 15 },
      ];

      for (const testCase of testCases8) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      };
    });

    test("should handle power of 2 values correctly", async function (): Promise<void> {
      const testCases = [
        { in: 1, out: 1 },     // 2^0
        { in: 2, out: 2 },     // 2^1
        { in: 4, out: 4 },     // 2^2
        { in: 8, out: 8 },     // 2^3
        { in: 16, out: 0 },    // 2^4 (exceeds mask)
        { in: 32, out: 0 },    // 2^5 (exceeds mask)
        { in: 64, out: 0 },    // 2^6 (exceeds mask)
        { in: 128, out: 0 },   // 2^7 (exceeds mask)
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should handle alternating bit patterns", async function (): Promise<void> {
      const testCases = [
        { in: 85, out: 5 },    // 0101 0101 & 0000 1111 = 0000 0101
        { in: 170, out: 10 },  // 1010 1010 & 0000 1111 = 0000 1010
        { in: 51, out: 3 },    // 0011 0011 & 0000 1111 = 0000 0011
        { in: 204, out: 12 },  // 1100 1100 & 0000 1111 = 0000 1100
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 256 },    // exceeds 8-bit range
        { in: 512 },    // exceeds 8-bit range
        { in: 1024 },   // exceeds 8-bit range
        { in: -1 },     // negative value
        { in: -10 },    // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("16-bit 0xFF Mask Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "./shared/components/bits.circom", {
        templateName: "Mask",
        templateParams: ["16", "255"],
      });
      console.info("16-bit 0xFF mask circuit constraints:", await circuit.getConstraintCount());
    });

    test("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },           // 0x0000 & 0x00FF = 0x0000
        { in: 255, out: 255 },       // 0x00FF & 0x00FF = 0x00FF
        { in: 256, out: 0 },         // 0x0100 & 0x00FF = 0x0000
        { in: 511, out: 255 },       // 0x01FF & 0x00FF = 0x00FF
        { in: 65280, out: 0 },       // 0xFF00 & 0x00FF = 0x0000
        { in: 65535, out: 255 },     // 0xFFFF & 0x00FF = 0x00FF
        { in: 43690, out: 170 },     // 0xAAAA & 0x00FF = 0x00AA
        { in: 21845, out: 85 },      // 0x5555 & 0x00FF = 0x0055
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      };
    });

    test("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases16 = [
        { in: 0, out: 0 },
        { in: 65535, out: 255 },
      ];

      for (const testCase of testCases16) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      };
    });

    test("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 65536 },   // exceeds 16-bit range
        { in: 131072 },  // exceeds 16-bit range
        { in: -1 },      // negative value
        { in: -100 },    // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("32-bit 0xFFFF Mask Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "./shared/components/bits.circom", {
        templateName: "Mask",
        templateParams: ["32", "65535"],
      });
      console.info("32-bit 0xFFFF mask circuit constraints:", await circuit.getConstraintCount());
    });

    test("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },               // 0x00000000 & 0x0000FFFF = 0x00000000
        { in: 65535, out: 65535 },       // 0x0000FFFF & 0x0000FFFF = 0x0000FFFF
        { in: 65536, out: 0 },           // 0x00010000 & 0x0000FFFF = 0x00000000
        { in: 131071, out: 65535 },      // 0x0001FFFF & 0x0000FFFF = 0x0000FFFF
        { in: 4294901760, out: 0 },      // 0xFFFF0000 & 0x0000FFFF = 0x00000000
        { in: 4294967295, out: 65535 },  // 0xFFFFFFFF & 0x0000FFFF = 0x0000FFFF
        { in: 2863311530, out: 43690 },  // 0xAAAAAAAA & 0x0000FFFF = 0x0000AAAA
        { in: 1431655765, out: 21845 },  // 0x55555555 & 0x0000FFFF = 0x00005555
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      };
    });

    test("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases32 = [
        { in: 0, out: 0 },
        { in: 4294967295, out: 65535 },
      ];

      for (const testCase of testCases32) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      };
    });

    test("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 4294967296 }, // exceeds 32-bit range
        { in: 8589934592 }, // exceeds 32-bit range
        { in: -1 },         // negative value
        { in: -1000 },      // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});

describe("ShiftRight Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("8-bit 1-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "./shared/components/bits.circom", {
        templateName: "ShiftRight",
        templateParams: ["8", "1"],
      });
      console.info("8-bit 1-offset shift circuit constraints:", await circuit.getConstraintCount());
    });

    test("should perform correct 1-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },        // 00000000 >> 1 = 00000000
        { in: 1, out: 0 },        // 00000001 >> 1 = 00000000
        { in: 2, out: 1 },        // 00000010 >> 1 = 00000001
        { in: 4, out: 2 },        // 00000100 >> 1 = 00000010
        { in: 8, out: 4 },        // 00001000 >> 1 = 00000100
        { in: 16, out: 8 },       // 00010000 >> 1 = 00001000
        { in: 32, out: 16 },      // 00100000 >> 1 = 00010000
        { in: 64, out: 32 },      // 01000000 >> 1 = 00100000
        { in: 128, out: 64 },     // 10000000 >> 1 = 01000000
        { in: 255, out: 127 },    // 11111111 >> 1 = 01111111
        { in: 51, out: 25 },      // 00110011 >> 1 = 00011001
        { in: 85, out: 42 },      // 01010101 >> 1 = 00101010
        { in: 170, out: 85 },     // 10101010 >> 1 = 01010101
        { in: 204, out: 102 },    // 11001100 >> 1 = 01100110
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      };
    });

    test("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 256 },   // exceeds 8-bit range
        { in: 512 },   // exceeds 8-bit range
        { in: 1024 },  // exceeds 8-bit range
        { in: -1 },    // negative value
        { in: -10 },   // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("8-bit 2-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "./shared/components/bits.circom", {
        templateName: "ShiftRight",
        templateParams: ["8", "2"],
      });
      console.info("8-bit 2-offset shift circuit constraints:", await circuit.getConstraintCount());
    });

    test("should perform correct 2-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },       // 00000000 >> 2 = 00000000
        { in: 1, out: 0 },       // 00000001 >> 2 = 00000000
        { in: 2, out: 0 },       // 00000010 >> 2 = 00000000
        { in: 3, out: 0 },       // 00000011 >> 2 = 00000000
        { in: 4, out: 1 },       // 00000100 >> 2 = 00000001
        { in: 8, out: 2 },       // 00001000 >> 2 = 00000010
        { in: 16, out: 4 },      // 00010000 >> 2 = 00000100
        { in: 32, out: 8 },      // 00100000 >> 2 = 00001000
        { in: 64, out: 16 },     // 01000000 >> 2 = 00010000
        { in: 128, out: 32 },    // 10000000 >> 2 = 00100000
        { in: 255, out: 63 },    // 11111111 >> 2 = 00111111
        { in: 204, out: 51 },    // 11001100 >> 2 = 00110011
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 256 },   // exceeds 8-bit range
        { in: 512 },   // exceeds 8-bit range
        { in: -1 },    // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("8-bit 4-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "./shared/components/bits.circom", {
        templateName: "ShiftRight",
        templateParams: ["8", "4"],
      });
      console.info("8-bit 4-offset shift circuit constraints:", await circuit.getConstraintCount());
    });

    test("should perform correct 4-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },       // 00000000 >> 4 = 00000000
        { in: 15, out: 0 },      // 00001111 >> 4 = 00000000
        { in: 16, out: 1 },      // 00010000 >> 4 = 00000001
        { in: 32, out: 2 },      // 00100000 >> 4 = 00000010
        { in: 48, out: 3 },      // 00110000 >> 4 = 00000011
        { in: 64, out: 4 },      // 01000000 >> 4 = 00000100
        { in: 128, out: 8 },     // 10000000 >> 4 = 00001000
        { in: 240, out: 15 },    // 11110000 >> 4 = 00001111
        { in: 255, out: 15 },    // 11111111 >> 4 = 00001111
        { in: 170, out: 10 },    // 10101010 >> 4 = 00001010
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 256 },   // exceeds 8-bit range
        { in: 512 },   // exceeds 8-bit range
        { in: -1 },    // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("16-bit 8-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "./shared/components/bits.circom", {
        templateName: "ShiftRight",
        templateParams: ["16", "8"],
      });
      console.info("16-bit 8-offset shift circuit constraints:", await circuit.getConstraintCount());
    });

    test("should perform correct 8-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },
        { in: 255, out: 0 },       // 0x00FF >> 8 = 0x0000
        { in: 256, out: 1 },       // 0x0100 >> 8 = 0x0001
        { in: 512, out: 2 },       // 0x0200 >> 8 = 0x0002
        { in: 1024, out: 4 },      // 0x0400 >> 8 = 0x0004
        { in: 32768, out: 128 },   // 0x8000 >> 8 = 0x0080
        { in: 65535, out: 255 },   // 0xFFFF >> 8 = 0x00FF
        { in: 65280, out: 255 },   // 0xFF00 >> 8 = 0x00FF
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 65536 },  // exceeds 16-bit range
        { in: 131072 }, // exceeds 16-bit range
        { in: -1 },     // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("32-bit 8-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "./shared/components/bits.circom", {
        templateName: "ShiftRight",
        templateParams: ["32", "8"],
      });
      console.info("32-bit 8-offset shift circuit constraints:", await circuit.getConstraintCount());
    });

    test("should perform correct 8-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },
        { in: 1, out: 0 },                  // 0x00000001 >> 8 = 0x00000000
        { in: 128, out: 0 },                // 0x00000080 >> 8 = 0x00000000
        { in: 255, out: 0 },                // 0x000000FF >> 8 = 0x00000000
        { in: 256, out: 1 },                // 0x00000100 >> 8 = 0x00000001
        { in: 65536, out: 256 },            // 0x00010000 >> 8 = 0x00000100
        { in: 16777216, out: 65536 },       // 0x01000000 >> 8 = 0x00010000
        { in: 4278190080, out: 16711680 },  // 0xFF000000 >> 8 = 0x00FF0000
        { in: 4294967295, out: 16777215 },  // 0xFFFFFFFF >> 8 = 0x00FFFFFF
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 4294967296 }, // exceeds 32-bit range
        { in: 8589934592 }, // exceeds 32-bit range
        { in: -1 },         // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});