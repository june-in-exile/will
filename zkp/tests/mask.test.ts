import { WitnessTester } from "./utils";

describe("Mask Circuit", function () {
  let circuit8_0x0F: WitnessTester<["in"], ["out"]>;
  let circuit16_0xFF: WitnessTester<["in"], ["out"]>;
  let circuit32_0xFFFF: WitnessTester<["in"], ["out"]>;

  beforeAll(async function (): Promise<void> {
    circuit8_0x0F = await WitnessTester.construct(
      "./shared/components/mask.circom", {
      templateParams: ["8", "15"],
    });
    console.info("8-bit 0x0F mask circuit constraints:", await circuit8_0x0F.getConstraintCount());

    circuit16_0xFF = await WitnessTester.construct(
      "./shared/components/mask.circom", {
      templateParams: ["16", "255"],
    });
    console.info("16-bit 0xFF mask circuit constraints:", await circuit16_0xFF.getConstraintCount());

    circuit32_0xFFFF = await WitnessTester.construct(
      "./shared/components/mask.circom", {
      templateParams: ["32", "65535"],
    });
    console.info("32-bit 0xFFFF mask circuit constraints:", await circuit32_0xFFFF.getConstraintCount());
  });

  describe("Basic Mask Operations", function (): void {
    test("should perform correct mask operations for 8-bit values", async function (): Promise<void> {
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
        await circuit8_0x0F.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should perform correct mask operations for 16-bit values", async function (): Promise<void> {
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
        await circuit16_0xFF.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    test("should perform correct mask operations for 32-bit values", async function (): Promise<void> {
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
        await circuit32_0xFFFF.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });
  });

  describe("Boundary Value Testing", function (): void {
    test("should handle minimum and maximum values correctly", async function (): Promise<void> {
      // 8-bit boundary tests
      const testCases8 = [
        { in: 0, out: 0 },     // minimum value
        { in: 255, out: 15 },  // maximum value for 8 bits
      ];

      for (const testCase of testCases8) {
        await circuit8_0x0F.expectPass({ in: testCase.in }, { out: testCase.out });
      }

      // 16-bit boundary tests
      const testCases16 = [
        { in: 0, out: 0 },       // minimum value
        { in: 65535, out: 255 }, // maximum value for 16 bits
      ];

      for (const testCase of testCases16) {
        await circuit16_0xFF.expectPass({ in: testCase.in }, { out: testCase.out });
      }

      // 32-bit boundary tests
      const testCases32 = [
        { in: 0, out: 0 },             // minimum value
        { in: 4294967295, out: 65535 }, // maximum value for 32 bits
      ];

      for (const testCase of testCases32) {
        await circuit32_0xFFFF.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });
  });

  describe("Edge Cases", function (): void {
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
        await circuit8_0x0F.expectPass({ in: testCase.in }, { out: testCase.out });
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
        await circuit8_0x0F.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });
  });

  describe("Invalid Input Handling", function (): void {
    test("should reject out-of-range values for 8-bit circuit", async function (): Promise<void> {
      const testCases = [
        { in: 256 },    // exceeds 8-bit range
        { in: 512 },    // exceeds 8-bit range
        { in: 1024 },   // exceeds 8-bit range
        { in: -1 },     // negative value
        { in: -10 },    // negative value
      ];

      for (const testCase of testCases) {
        await circuit8_0x0F.expectFail(testCase);
      }
    });

    test("should reject out-of-range values for 16-bit circuit", async function (): Promise<void> {
      const testCases = [
        { in: 65536 },   // exceeds 16-bit range
        { in: 131072 },  // exceeds 16-bit range
        { in: -1 },      // negative value
        { in: -100 },    // negative value
      ];

      for (const testCase of testCases) {
        await circuit16_0xFF.expectFail(testCase);
      }
    });

    test("should reject out-of-range values for 32-bit circuit", async function (): Promise<void> {
      const testCases = [
        { in: 4294967296 }, // exceeds 32-bit range
        { in: 8589934592 }, // exceeds 32-bit range
        { in: -1 },         // negative value
        { in: -1000 },      // negative value
      ];

      for (const testCase of testCases) {
        await circuit32_0xFFFF.expectFail(testCase);
      }
    });
  });
});