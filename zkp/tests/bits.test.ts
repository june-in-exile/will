import { WitnessTester } from "./utils";

describe("Mask Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("8-bit 0x0F Mask Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "Mask",
        {
          templateParams: ["8", "15"],
        },
      );
      console.info(
        "8-bit 0x0F mask circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 }, // 0000 0000 & 0000 1111 = 0000 0000
        { in: 15, out: 15 }, // 0000 1111 & 0000 1111 = 0000 1111
        { in: 16, out: 0 }, // 0001 0000 & 0000 1111 = 0000 0000
        { in: 31, out: 15 }, // 0001 1111 & 0000 1111 = 0000 1111
        { in: 240, out: 0 }, // 1111 0000 & 0000 1111 = 0000 0000
        { in: 255, out: 15 }, // 1111 1111 & 0000 1111 = 0000 1111
        { in: 170, out: 10 }, // 1010 1010 & 0000 1111 = 0000 1010
        { in: 85, out: 5 }, // 0101 0101 & 0000 1111 = 0000 0101
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases8 = [
        { in: 0, out: 0 },
        { in: 255, out: 15 },
      ];

      for (const testCase of testCases8) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should handle power of 2 values correctly", async function (): Promise<void> {
      const testCases = [
        { in: 1, out: 1 }, // 2^0
        { in: 2, out: 2 }, // 2^1
        { in: 4, out: 4 }, // 2^2
        { in: 8, out: 8 }, // 2^3
        { in: 16, out: 0 }, // 2^4 (exceeds mask)
        { in: 32, out: 0 }, // 2^5 (exceeds mask)
        { in: 64, out: 0 }, // 2^6 (exceeds mask)
        { in: 128, out: 0 }, // 2^7 (exceeds mask)
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should handle alternating bit patterns", async function (): Promise<void> {
      const testCases = [
        { in: 85, out: 5 }, // 0101 0101 & 0000 1111 = 0000 0101
        { in: 170, out: 10 }, // 1010 1010 & 0000 1111 = 0000 1010
        { in: 51, out: 3 }, // 0011 0011 & 0000 1111 = 0000 0011
        { in: 204, out: 12 }, // 1100 1100 & 0000 1111 = 0000 1100
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 256 }, // exceeds 8-bit range
        { in: 512 }, // exceeds 8-bit range
        { in: 1024 }, // exceeds 8-bit range
        { in: -1 }, // negative value
        { in: -10 }, // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("16-bit 0xFF Mask Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "Mask",
        {
          templateParams: ["16", "255"],
        },
      );
      console.info(
        "16-bit 0xFF mask circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 }, // 0x0000 & 0x00FF = 0x0000
        { in: 255, out: 255 }, // 0x00FF & 0x00FF = 0x00FF
        { in: 256, out: 0 }, // 0x0100 & 0x00FF = 0x0000
        { in: 511, out: 255 }, // 0x01FF & 0x00FF = 0x00FF
        { in: 65280, out: 0 }, // 0xFF00 & 0x00FF = 0x0000
        { in: 65535, out: 255 }, // 0xFFFF & 0x00FF = 0x00FF
        { in: 43690, out: 170 }, // 0xAAAA & 0x00FF = 0x00AA
        { in: 21845, out: 85 }, // 0x5555 & 0x00FF = 0x0055
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases16 = [
        { in: 0, out: 0 },
        { in: 65535, out: 255 },
      ];

      for (const testCase of testCases16) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 65536 }, // exceeds 16-bit range
        { in: 131072 }, // exceeds 16-bit range
        { in: -1 }, // negative value
        { in: -100 }, // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("32-bit 0xFFFF Mask Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "Mask",
        {
          templateParams: ["32", "65535"],
        },
      );
      console.info(
        "32-bit 0xFFFF mask circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 }, // 0x00000000 & 0x0000FFFF = 0x00000000
        { in: 65535, out: 65535 }, // 0x0000FFFF & 0x0000FFFF = 0x0000FFFF
        { in: 65536, out: 0 }, // 0x00010000 & 0x0000FFFF = 0x00000000
        { in: 131071, out: 65535 }, // 0x0001FFFF & 0x0000FFFF = 0x0000FFFF
        { in: 4294901760, out: 0 }, // 0xFFFF0000 & 0x0000FFFF = 0x00000000
        { in: 4294967295, out: 65535 }, // 0xFFFFFFFF & 0x0000FFFF = 0x0000FFFF
        { in: 2863311530, out: 43690 }, // 0xAAAAAAAA & 0x0000FFFF = 0x0000AAAA
        { in: 1431655765, out: 21845 }, // 0x55555555 & 0x0000FFFF = 0x00005555
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases32 = [
        { in: 0, out: 0 },
        { in: 4294967295, out: 65535 },
      ];

      for (const testCase of testCases32) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 4294967296 }, // exceeds 32-bit range
        { in: 8589934592 }, // exceeds 32-bit range
        { in: -1 }, // negative value
        { in: -1000 }, // negative value
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
        "circuits/shared/components/bits.circom",
        "ShiftRight",
        {
          templateParams: ["8", "1"],
        },
      );
      console.info(
        "8-bit 1-offset shift circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct 1-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 }, // 00000000 >> 1 = 00000000
        { in: 1, out: 0 }, // 00000001 >> 1 = 00000000
        { in: 2, out: 1 }, // 00000010 >> 1 = 00000001
        { in: 4, out: 2 }, // 00000100 >> 1 = 00000010
        { in: 8, out: 4 }, // 00001000 >> 1 = 00000100
        { in: 16, out: 8 }, // 00010000 >> 1 = 00001000
        { in: 32, out: 16 }, // 00100000 >> 1 = 00010000
        { in: 64, out: 32 }, // 01000000 >> 1 = 00100000
        { in: 128, out: 64 }, // 10000000 >> 1 = 01000000
        { in: 255, out: 127 }, // 11111111 >> 1 = 01111111
        { in: 51, out: 25 }, // 00110011 >> 1 = 00011001
        { in: 85, out: 42 }, // 01010101 >> 1 = 00101010
        { in: 170, out: 85 }, // 10101010 >> 1 = 01010101
        { in: 204, out: 102 }, // 11001100 >> 1 = 01100110
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 256 }, // exceeds 8-bit range
        { in: 512 }, // exceeds 8-bit range
        { in: 1024 }, // exceeds 8-bit range
        { in: -1 }, // negative value
        { in: -10 }, // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("8-bit 2-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "ShiftRight",
        {
          templateParams: ["8", "2"],
        },
      );
      console.info(
        "8-bit 2-offset shift circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct 2-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 }, // 00000000 >> 2 = 00000000
        { in: 1, out: 0 }, // 00000001 >> 2 = 00000000
        { in: 2, out: 0 }, // 00000010 >> 2 = 00000000
        { in: 3, out: 0 }, // 00000011 >> 2 = 00000000
        { in: 4, out: 1 }, // 00000100 >> 2 = 00000001
        { in: 8, out: 2 }, // 00001000 >> 2 = 00000010
        { in: 16, out: 4 }, // 00010000 >> 2 = 00000100
        { in: 32, out: 8 }, // 00100000 >> 2 = 00001000
        { in: 64, out: 16 }, // 01000000 >> 2 = 00010000
        { in: 128, out: 32 }, // 10000000 >> 2 = 00100000
        { in: 255, out: 63 }, // 11111111 >> 2 = 00111111
        { in: 204, out: 51 }, // 11001100 >> 2 = 00110011
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 256 }, // exceeds 8-bit range
        { in: 512 }, // exceeds 8-bit range
        { in: -1 }, // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("8-bit 4-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "ShiftRight",
        {
          templateParams: ["8", "4"],
        },
      );
      console.info(
        "8-bit 4-offset shift circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct 4-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 }, // 00000000 >> 4 = 00000000
        { in: 15, out: 0 }, // 00001111 >> 4 = 00000000
        { in: 16, out: 1 }, // 00010000 >> 4 = 00000001
        { in: 32, out: 2 }, // 00100000 >> 4 = 00000010
        { in: 48, out: 3 }, // 00110000 >> 4 = 00000011
        { in: 64, out: 4 }, // 01000000 >> 4 = 00000100
        { in: 128, out: 8 }, // 10000000 >> 4 = 00001000
        { in: 240, out: 15 }, // 11110000 >> 4 = 00001111
        { in: 255, out: 15 }, // 11111111 >> 4 = 00001111
        { in: 170, out: 10 }, // 10101010 >> 4 = 00001010
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 256 }, // exceeds 8-bit range
        { in: 512 }, // exceeds 8-bit range
        { in: -1 }, // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("16-bit 8-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "ShiftRight",
        {
          templateParams: ["16", "8"],
        },
      );
      console.info(
        "16-bit 8-offset shift circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct 8-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },
        { in: 255, out: 0 }, // 0x00FF >> 8 = 0x0000
        { in: 256, out: 1 }, // 0x0100 >> 8 = 0x0001
        { in: 512, out: 2 }, // 0x0200 >> 8 = 0x0002
        { in: 1024, out: 4 }, // 0x0400 >> 8 = 0x0004
        { in: 32768, out: 128 }, // 0x8000 >> 8 = 0x0080
        { in: 65535, out: 255 }, // 0xFFFF >> 8 = 0x00FF
        { in: 65280, out: 255 }, // 0xFF00 >> 8 = 0x00FF
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 65536 }, // exceeds 16-bit range
        { in: 131072 }, // exceeds 16-bit range
        { in: -1 }, // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("32-bit 8-offset Right Shift Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "ShiftRight",
        {
          templateParams: ["32", "8"],
        },
      );
      console.info(
        "32-bit 8-offset shift circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct 8-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { in: 0, out: 0 },
        { in: 1, out: 0 }, // 0x00000001 >> 8 = 0x00000000
        { in: 128, out: 0 }, // 0x00000080 >> 8 = 0x00000000
        { in: 255, out: 0 }, // 0x000000FF >> 8 = 0x00000000
        { in: 256, out: 1 }, // 0x00000100 >> 8 = 0x00000001
        { in: 65536, out: 256 }, // 0x00010000 >> 8 = 0x00000100
        { in: 16777216, out: 65536 }, // 0x01000000 >> 8 = 0x00010000
        { in: 4278190080, out: 16711680 }, // 0xFF000000 >> 8 = 0x00FF0000
        { in: 4294967295, out: 16777215 }, // 0xFFFFFFFF >> 8 = 0x00FFFFFF
      ];

      for (const testCase of testCases) {
        await circuit.expectPass({ in: testCase.in }, { out: testCase.out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { in: 4294967296 }, // exceeds 32-bit range
        { in: 8589934592 }, // exceeds 32-bit range
        { in: -1 }, // negative value
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});

describe("BitwiseXor Circuit", function () {
  let circuit: WitnessTester<["a", "b"], ["c"]>;

  describe("8-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["8"],
        },
      );
      console.info(
        "8-bit Xor circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct Xor operations", async function (): Promise<void> {
      const testCases = [
        { a: 0, b: 0, c: 0 }, // 0000 0000 ^ 0000 0000 = 0000 0000
        { a: 0, b: 255, c: 255 }, // 0000 0000 ^ 1111 1111 = 1111 1111
        { a: 255, b: 0, c: 255 }, // 1111 1111 ^ 0000 0000 = 1111 1111
        { a: 255, b: 255, c: 0 }, // 1111 1111 ^ 1111 1111 = 0000 0000
        { a: 170, b: 85, c: 255 }, // 1010 1010 ^ 0101 0101 = 1111 1111
        { a: 85, b: 170, c: 255 }, // 0101 0101 ^ 1010 1010 = 1111 1111
        { a: 51, b: 204, c: 255 }, // 0011 0011 ^ 1100 1100 = 1111 1111
        { a: 204, b: 51, c: 255 }, // 1100 1100 ^ 0011 0011 = 1111 1111
        { a: 15, b: 240, c: 255 }, // 0000 1111 ^ 1111 0000 = 1111 1111
        { a: 240, b: 15, c: 255 }, // 1111 0000 ^ 0000 1111 = 1111 1111
      ];

      for (const testCase of testCases) {
        await circuit.expectPass(
          { a: testCase.a, b: testCase.b },
          { c: testCase.c },
        );
      }
    });

    it("should handle power of 2 values correctly", async function (): Promise<void> {
      const testCases = [
        { a: 1, b: 1, c: 0 }, // 2^0 ^ 2^0 = 0
        { a: 2, b: 2, c: 0 }, // 2^1 ^ 2^1 = 0
        { a: 4, b: 4, c: 0 }, // 2^2 ^ 2^2 = 0
        { a: 8, b: 8, c: 0 }, // 2^3 ^ 2^3 = 0
        { a: 16, b: 16, c: 0 }, // 2^4 ^ 2^4 = 0
        { a: 32, b: 32, c: 0 }, // 2^5 ^ 2^5 = 0
        { a: 64, b: 64, c: 0 }, // 2^6 ^ 2^6 = 0
        { a: 128, b: 128, c: 0 }, // 2^7 ^ 2^7 = 0
      ];

      for (const testCase of testCases) {
        await circuit.expectPass(
          { a: testCase.a, b: testCase.b },
          { c: testCase.c },
        );
      }
    });

    it("should handle identity operations", async function (): Promise<void> {
      const testCases = [
        { a: 170, b: 0, c: 170 }, // Xor with 0 returns original
        { a: 85, b: 0, c: 85 }, // Xor with 0 returns original
        { a: 255, b: 0, c: 255 }, // Xor with 0 returns original
        { a: 123, b: 123, c: 0 }, // Xor with self returns 0
        { a: 200, b: 200, c: 0 }, // Xor with self returns 0
      ];

      for (const testCase of testCases) {
        await circuit.expectPass(
          { a: testCase.a, b: testCase.b },
          { c: testCase.c },
        );
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { a: 256, b: 0 }, // exceeds 8-bit range
        { a: 0, b: 256 }, // exceeds 8-bit range
        { a: 512, b: 100 }, // exceeds 8-bit range
        { a: 100, b: 512 }, // exceeds 8-bit range
        { a: -1, b: 0 }, // negative value
        { a: 0, b: -1 }, // negative value
        { a: -10, b: -20 }, // negative values
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("16-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["16"],
        },
      );
      console.info(
        "16-bit Xor circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct Xor operations", async function (): Promise<void> {
      const testCases = [
        { a: 0, b: 0, c: 0 }, // 0x0000 ^ 0x0000 = 0x0000
        { a: 0, b: 65535, c: 65535 }, // 0x0000 ^ 0xFFFF = 0xFFFF
        { a: 65535, b: 0, c: 65535 }, // 0xFFFF ^ 0x0000 = 0xFFFF
        { a: 65535, b: 65535, c: 0 }, // 0xFFFF ^ 0xFFFF = 0x0000
        { a: 43690, b: 21845, c: 65535 }, // 0xAAAA ^ 0x5555 = 0xFFFF
        { a: 21845, b: 43690, c: 65535 }, // 0x5555 ^ 0xAAAA = 0xFFFF
        { a: 61680, b: 3855, c: 65535 }, // 0xF0F0 ^ 0x0F0F = 0xFFFF
        { a: 255, b: 65280, c: 65535 }, // 0x00FF ^ 0xFF00 = 0xFFFF
      ];

      for (const testCase of testCases) {
        await circuit.expectPass(
          { a: testCase.a, b: testCase.b },
          { c: testCase.c },
        );
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { a: 65536, b: 0 }, // exceeds 16-bit range
        { a: 0, b: 65536 }, // exceeds 16-bit range
        { a: 131072, b: 1000 }, // exceeds 16-bit range
        { a: -1, b: 0 }, // negative value
        { a: 0, b: -1 }, // negative value
        { a: -100, b: -200 }, // negative values
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });

  describe("32-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["32"],
        },
      );
      console.info(
        "32-bit Xor circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should perform correct Xor operations", async function (): Promise<void> {
      const testCases = [
        { a: 0, b: 0, c: 0 }, // 0x00000000 ^ 0x00000000 = 0x00000000
        { a: 0, b: 4294967295, c: 4294967295 }, // 0x00000000 ^ 0xFFFFFFFF = 0xFFFFFFFF
        { a: 4294967295, b: 0, c: 4294967295 }, // 0xFFFFFFFF ^ 0x00000000 = 0xFFFFFFFF
        { a: 4294967295, b: 4294967295, c: 0 }, // 0xFFFFFFFF ^ 0xFFFFFFFF = 0x00000000
        { a: 2863311530, b: 1431655765, c: 4294967295 }, // 0xAAAAAAAA ^ 0x55555555 = 0xFFFFFFFF
        { a: 1431655765, b: 2863311530, c: 4294967295 }, // 0x55555555 ^ 0xAAAAAAAA = 0xFFFFFFFF
        { a: 4042322160, b: 252645135, c: 4294967295 }, // 0xF0F0F0F0 ^ 0x0F0F0F0F = 0xFFFFFFFF
        { a: 65535, b: 4294901760, c: 4294967295 }, // 0x0000FFFF ^ 0xFFFF0000 = 0xFFFFFFFF
      ];

      for (const testCase of testCases) {
        await circuit.expectPass(
          { a: testCase.a, b: testCase.b },
          { c: testCase.c },
        );
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { a: 4294967296, b: 0 }, // exceeds 32-bit range
        { a: 0, b: 4294967296 }, // exceeds 32-bit range
        { a: 8589934592, b: 1000 }, // exceeds 32-bit range
        { a: -1, b: 0 }, // negative value
        { a: 0, b: -1 }, // negative value
        { a: -1000, b: -2000 }, // negative values
      ];

      for (const testCase of testCases) {
        await circuit.expectFail(testCase);
      }
    });
  });
});
