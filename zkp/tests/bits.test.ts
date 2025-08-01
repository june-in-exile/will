import { WitnessTester } from "./util/index.js";

describe("Mod2 Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Modulo 2 Operations (Parity Check)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "Mod2",
      );
      circuit.setConstraint("modulo 2");
    });

    it("should correctly identify even numbers", async function (): Promise<void> {
      const numbers = [0, 2, 4, 6, 8, 10, 100, 1000];

      for (const num of numbers) {
        await circuit.expectPass({ in: num }, { out: num % 2 });
      }
    });

    it("should correctly identify odd numbers", async function (): Promise<void> {
      const numbers = [1, 3, 5, 7, 9, 11, 101, 1001];

      for (const num of numbers) {
        await circuit.expectPass({ in: num }, { out: num % 2 });
      }
    });

    it("should handle large numbers correctly", async function (): Promise<void> {
      const numbers = [
        1000000, 1000001, 9999998, 9999999, 16777216, 16777217, 33554432,
        33554433,
      ];

      for (const num of numbers) {
        await circuit.expectPass({ in: num }, { out: num % 2 });
      }
    });

    it("should handle edge cases correctly", async function (): Promise<void> {
      const numbers = [0, 1, 2, 255, 256, 65535, 65536];

      for (const num of numbers) {
        await circuit.expectPass({ in: num }, { out: num % 2 });
      }
    });
  });
});

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
      circuit.setConstraint("8-bit 0x0F mask");
    });

    it("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 }, // 0000 0000 & 0000 1111 = 0000 0000
        { _in: 15, _out: 15 }, // 0000 1111 & 0000 1111 = 0000 1111
        { _in: 16, _out: 0 }, // 0001 0000 & 0000 1111 = 0000 0000
        { _in: 31, _out: 15 }, // 0001 1111 & 0000 1111 = 0000 1111
        { _in: 240, _out: 0 }, // 1111 0000 & 0000 1111 = 0000 0000
        { _in: 255, _out: 15 }, // 1111 1111 & 0000 1111 = 0000 1111
        { _in: 170, _out: 10 }, // 1010 1010 & 0000 1111 = 0000 1010
        { _in: 85, _out: 5 }, // 0101 0101 & 0000 1111 = 0000 0101
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 },
        { _in: 255, _out: 15 },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle power of 2 values correctly", async function (): Promise<void> {
      const testCases = [
        { _in: 1, _out: 1 }, // 2^0
        { _in: 2, _out: 2 }, // 2^1
        { _in: 4, _out: 4 }, // 2^2
        { _in: 8, _out: 8 }, // 2^3
        { _in: 16, _out: 0 }, // 2^4 (exceeds mask)
        { _in: 32, _out: 0 }, // 2^5 (exceeds mask)
        { _in: 64, _out: 0 }, // 2^6 (exceeds mask)
        { _in: 128, _out: 0 }, // 2^7 (exceeds mask)
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle alternating bit patterns", async function (): Promise<void> {
      const testCases = [
        { _in: 85, _out: 5 }, // 0101 0101 & 0000 1111 = 0000 0101
        { _in: 170, _out: 10 }, // 1010 1010 & 0000 1111 = 0000 1010
        { _in: 51, _out: 3 }, // 0011 0011 & 0000 1111 = 0000 0011
        { _in: 204, _out: 12 }, // 1100 1100 & 0000 1111 = 0000 1100
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
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
      circuit.setConstraint("16-bit 0x00FF mask");
    });

    it("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 }, // 0x0000 & 0x00FF = 0x0000
        { _in: 255, _out: 255 }, // 0x00FF & 0x00FF = 0x00FF
        { _in: 256, _out: 0 }, // 0x0100 & 0x00FF = 0x0000
        { _in: 511, _out: 255 }, // 0x01FF & 0x00FF = 0x00FF
        { _in: 65280, _out: 0 }, // 0xFF00 & 0x00FF = 0x0000
        { _in: 65535, _out: 255 }, // 0xFFFF & 0x00FF = 0x00FF
        { _in: 43690, _out: 170 }, // 0xAAAA & 0x00FF = 0x00AA
        { _in: 21845, _out: 85 }, // 0x5555 & 0x00FF = 0x0055
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 },
        { _in: 65535, _out: 255 },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
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
      circuit.setConstraint("32-bit 0x0000FFFF mask");
    });

    it("should perform correct mask operations", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 }, // 0x00000000 & 0x0000FFFF = 0x00000000
        { _in: 65535, _out: 65535 }, // 0x0000FFFF & 0x0000FFFF = 0x0000FFFF
        { _in: 65536, _out: 0 }, // 0x00010000 & 0x0000FFFF = 0x00000000
        { _in: 131071, _out: 65535 }, // 0x0001FFFF & 0x0000FFFF = 0x0000FFFF
        { _in: 4294901760, _out: 0 }, // 0xFFFF0000 & 0x0000FFFF = 0x00000000
        { _in: 4294967295, _out: 65535 }, // 0xFFFFFFFF & 0x0000FFFF = 0x0000FFFF
        { _in: 2863311530, _out: 43690 }, // 0xAAAAAAAA & 0x0000FFFF = 0x0000AAAA
        { _in: 1431655765, _out: 21845 }, // 0x55555555 & 0x0000FFFF = 0x00005555
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle minimum and maximum values correctly", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 },
        { _in: 4294967295, _out: 65535 },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
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
      circuit.setConstraint("8-bit 1-offset shift right");
    });

    it("should perform correct 1-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 }, // 00000000 >> 1 = 00000000
        { _in: 1, _out: 0 }, // 00000001 >> 1 = 00000000
        { _in: 2, _out: 1 }, // 00000010 >> 1 = 00000001
        { _in: 4, _out: 2 }, // 00000100 >> 1 = 00000010
        { _in: 8, _out: 4 }, // 00001000 >> 1 = 00000100
        { _in: 16, _out: 8 }, // 00010000 >> 1 = 00001000
        { _in: 32, _out: 16 }, // 00100000 >> 1 = 00010000
        { _in: 64, _out: 32 }, // 01000000 >> 1 = 00100000
        { _in: 128, _out: 64 }, // 10000000 >> 1 = 01000000
        { _in: 255, _out: 127 }, // 11111111 >> 1 = 01111111
        { _in: 51, _out: 25 }, // 00110011 >> 1 = 00011001
        { _in: 85, _out: 42 }, // 01010101 >> 1 = 00101010
        { _in: 170, _out: 85 }, // 10101010 >> 1 = 01010101
        { _in: 204, _out: 102 }, // 11001100 >> 1 = 01100110
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
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
      circuit.setConstraint("8-bit 2-offset shift right");
    });

    it("should perform correct 2-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 }, // 00000000 >> 2 = 00000000
        { _in: 1, _out: 0 }, // 00000001 >> 2 = 00000000
        { _in: 2, _out: 0 }, // 00000010 >> 2 = 00000000
        { _in: 3, _out: 0 }, // 00000011 >> 2 = 00000000
        { _in: 4, _out: 1 }, // 00000100 >> 2 = 00000001
        { _in: 8, _out: 2 }, // 00001000 >> 2 = 00000010
        { _in: 16, _out: 4 }, // 00010000 >> 2 = 00000100
        { _in: 32, _out: 8 }, // 00100000 >> 2 = 00001000
        { _in: 64, _out: 16 }, // 01000000 >> 2 = 00010000
        { _in: 128, _out: 32 }, // 10000000 >> 2 = 00100000
        { _in: 255, _out: 63 }, // 11111111 >> 2 = 00111111
        { _in: 204, _out: 51 }, // 11001100 >> 2 = 00110011
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
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
      circuit.setConstraint("8-bit 4-offset shift right");
    });

    it("should perform correct 4-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 }, // 00000000 >> 4 = 00000000
        { _in: 15, _out: 0 }, // 00001111 >> 4 = 00000000
        { _in: 16, _out: 1 }, // 00010000 >> 4 = 00000001
        { _in: 32, _out: 2 }, // 00100000 >> 4 = 00000010
        { _in: 48, _out: 3 }, // 00110000 >> 4 = 00000011
        { _in: 64, _out: 4 }, // 01000000 >> 4 = 00000100
        { _in: 128, _out: 8 }, // 10000000 >> 4 = 00001000
        { _in: 240, _out: 15 }, // 11110000 >> 4 = 00001111
        { _in: 255, _out: 15 }, // 11111111 >> 4 = 00001111
        { _in: 170, _out: 10 }, // 10101010 >> 4 = 00001010
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
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
      circuit.setConstraint("16-bit 8-offset shift right");
    });

    it("should perform correct 8-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 },
        { _in: 255, _out: 0 }, // 0x00FF >> 8 = 0x0000
        { _in: 256, _out: 1 }, // 0x0100 >> 8 = 0x0001
        { _in: 512, _out: 2 }, // 0x0200 >> 8 = 0x0002
        { _in: 1024, _out: 4 }, // 0x0400 >> 8 = 0x0004
        { _in: 32768, _out: 128 }, // 0x8000 >> 8 = 0x0080
        { _in: 65535, _out: 255 }, // 0xFFFF >> 8 = 0x00FF
        { _in: 65280, _out: 255 }, // 0xFF00 >> 8 = 0x00FF
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
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
      circuit.setConstraint("32-bit 8-offset shift right");
    });

    it("should perform correct 8-bit right shift operations", async function (): Promise<void> {
      const testCases = [
        { _in: 0, _out: 0 },
        { _in: 1, _out: 0 }, // 0x00000001 >> 8 = 0x00000000
        { _in: 128, _out: 0 }, // 0x00000080 >> 8 = 0x00000000
        { _in: 255, _out: 0 }, // 0x000000FF >> 8 = 0x00000000
        { _in: 256, _out: 1 }, // 0x00000100 >> 8 = 0x00000001
        { _in: 65536, _out: 256 }, // 0x00010000 >> 8 = 0x00000100
        { _in: 16777216, _out: 65536 }, // 0x01000000 >> 8 = 0x00010000
        { _in: 4278190080, _out: 16711680 }, // 0xFF000000 >> 8 = 0x00FF0000
        { _in: 4294967295, _out: 16777215 }, // 0xFFFFFFFF >> 8 = 0x00FFFFFF
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
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
  let circuit: WitnessTester<["in"], ["out"]>;
  let circuitOptimized: WitnessTester<["in"], ["out"]>;

  it("should reject single input (n=1)", async function (): Promise<void> {
    await expect(
      WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["1", "8"],
        },
      ),
    ).rejects.toThrow();
    await expect(
      WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXorOptimized",
        {
          templateParams: ["1", "8"],
        },
      ),
    ).rejects.toThrow();
  });

  describe("2 inputs, 8-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["2", "8"],
        },
      );
      circuit.setConstraint("2x8-bit xor operation");
    });

    it("should perform correct xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0], _out: 0 }, // 0000 0000 ^ 0000 0000 = 0000 0000
        { _in: [0, 255], _out: 255 }, // 0000 0000 ^ 1111 1111 = 1111 1111
        { _in: [255, 0], _out: 255 }, // 1111 1111 ^ 0000 0000 = 1111 1111
        { _in: [255, 255], _out: 0 }, // 1111 1111 ^ 1111 1111 = 0000 0000
        { _in: [170, 85], _out: 255 }, // 1010 1010 ^ 0101 0101 = 1111 1111
        { _in: [85, 170], _out: 255 }, // 0101 0101 ^ 1010 1010 = 1111 1111
        { _in: [51, 204], _out: 255 }, // 0011 0011 ^ 1100 1100 = 1111 1111
        { _in: [204, 51], _out: 255 }, // 1100 1100 ^ 0011 0011 = 1111 1111
        { _in: [15, 240], _out: 255 }, // 0000 1111 ^ 1111 0000 = 1111 1111
        { _in: [240, 15], _out: 255 }, // 1111 0000 ^ 0000 1111 = 1111 1111
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle power of 2 values correctly", async function (): Promise<void> {
      const testCases = [
        { _in: [1, 1], _out: 0 }, // 2^0 ^ 2^0 = 0
        { _in: [2, 2], _out: 0 }, // 2^1 ^ 2^1 = 0
        { _in: [4, 4], _out: 0 }, // 2^2 ^ 2^2 = 0
        { _in: [8, 8], _out: 0 }, // 2^3 ^ 2^3 = 0
        { _in: [16, 16], _out: 0 }, // 2^4 ^ 2^4 = 0
        { _in: [32, 32], _out: 0 }, // 2^5 ^ 2^5 = 0
        { _in: [64, 64], _out: 0 }, // 2^6 ^ 2^6 = 0
        { _in: [128, 128], _out: 0 }, // 2^7 ^ 2^7 = 0
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle identity operations", async function (): Promise<void> {
      const testCases = [
        { _in: [170, 0], _out: 170 }, // Xor with 0 returns original
        { _in: [85, 0], _out: 85 }, // Xor with 0 returns original
        { _in: [255, 0], _out: 255 }, // Xor with 0 returns original
        { _in: [123, 123], _out: 0 }, // Xor with self returns 0
        { _in: [200, 200], _out: 0 }, // Xor with self returns 0
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { _in: [256, 0] }, // exceeds 8-bit range
        { _in: [0, 256] }, // exceeds 8-bit range
        { _in: [512, 100] }, // exceeds 8-bit range
        { _in: [100, 512] }, // exceeds 8-bit range
        { _in: [-1, 0] }, // negative value
        { _in: [0, -1] }, // negative value
        { _in: [-10, -20] }, // negative values
      ];

      for (const { _in } of testCases) {
        await circuit.expectFail({ in: _in });
      }
    });
  });

  describe("3 inputs, 8-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["3", "8"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXorOptimized",
        {
          templateParams: ["3", "8"],
        },
      );
      circuit.setConstraint("3x8-bit xor operation");
      circuitOptimized.setConstraint("optimized 3x8-bit xor operation");
    });

    it("should perform correct xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0], _out: 0 }, // 0000 0000 ^ 0000 0000 ^ 0000 0000 = 0000 0000
        { _in: [0, 0, 255], _out: 255 }, // 0000 0000 ^ 0000 0000 ^ 1111 1111 = 1111 1111
        { _in: [255, 255, 255], _out: 255 }, // 1111 1111 ^ 1111 1111 ^ 1111 1111 = 1111 1111
        { _in: [170, 85, 51], _out: 204 }, // 1010 1010 ^ 0101 0101 ^ 0011 0011 = 1100 1100
        { _in: [85, 170, 51], _out: 204 }, // 0101 0101 ^ 1010 1010 ^ 0011 0011 = 1100 1100
        { _in: [15, 240, 129], _out: 126 }, // 0000 1111 ^ 1111 0000 ^ 1000 0001 = 0111 1110
        { _in: [255, 255, 0], _out: 0 }, // 1111 1111 ^ 1111 1111 ^ 0000 0000 = 0000 0000
        { _in: [128, 64, 32], _out: 224 }, // 1000 0000 ^ 0100 0000 ^ 0010 0000 = 1110 0000
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
        await circuitOptimized.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle power of 2 values correctly", async function (): Promise<void> {
      const testCases = [
        { _in: [1, 1, 1], _out: 1 }, // 2^0 ^ 2^0 ^ 2^0 = 2^0
        { _in: [2, 2, 2], _out: 2 }, // 2^1 ^ 2^1 ^ 2^1 = 2^1
        { _in: [4, 4, 4], _out: 4 }, // 2^2 ^ 2^2 ^ 2^2 = 2^2
        { _in: [8, 8, 8], _out: 8 }, // 2^3 ^ 2^3 ^ 2^3 = 2^3
        { _in: [16, 16, 16], _out: 16 }, // 2^4 ^ 2^4 ^ 2^4 = 2^4
        { _in: [32, 32, 32], _out: 32 }, // 2^5 ^ 2^5 ^ 2^5 = 2^5
        { _in: [64, 64, 64], _out: 64 }, // 2^6 ^ 2^6 ^ 2^6 = 2^6
        { _in: [128, 128, 128], _out: 128 }, // 2^7 ^ 2^7 ^ 2^7 = 2^7
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
        await circuitOptimized.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle identity operations", async function (): Promise<void> {
      const testCases = [
        { _in: [170, 0, 0], _out: 170 }, // Xor with 0s returns original
        { _in: [85, 0, 0], _out: 85 }, // Xor with 0s returns original
        { _in: [255, 0, 0], _out: 255 }, // Xor with 0s returns original
        { _in: [123, 123, 0], _out: 0 }, // Xor with self returns 0
        { _in: [200, 200, 200], _out: 200 }, // Odd number of same values
        { _in: [100, 100, 100], _out: 100 }, // Odd number of same values
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
        await circuitOptimized.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { _in: [256, 0, 0] }, // exceeds 8-bit range
        { _in: [0, 256, 0] }, // exceeds 8-bit range
        { _in: [0, 0, 256] }, // exceeds 8-bit range
        { _in: [512, 100, 50] }, // exceeds 8-bit range
        { _in: [-1, 0, 0] }, // negative value
        { _in: [0, -1, 0] }, // negative value
        { _in: [0, 0, -1] }, // negative value
        { _in: [-10, -20, -30] }, // negative values
      ];

      for (const { _in } of testCases) {
        await circuit.expectFail({ in: _in });
        await circuitOptimized.expectFail({ in: _in });
      }
    });
  });

  describe("5 inputs, 8-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["5", "8"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXorOptimized",
        {
          templateParams: ["5", "8"],
        },
      );
      circuit.setConstraint("5x8-bit xor operation");
      circuitOptimized.setConstraint("optimized 5x8-bit xor operation");
    });

    it("should perform correct xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0, 0, 0], _out: 0 },
        { _in: [255, 255, 255, 255, 255], _out: 255 }, // Odd number of 255s
        { _in: [170, 85, 51, 204, 15], _out: 15 }, // Mixed values
        { _in: [1, 2, 4, 8, 16], _out: 31 }, // Powers of 2
        { _in: [100, 100, 100, 100, 100], _out: 100 }, // Odd number of same values
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
        await circuitOptimized.expectPass({ in: _in }, { out: _out });
      }
    });
  });

  describe("2 inputs, 16-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["2", "16"],
        },
      );
      circuit.setConstraint("2x16-bit xor operation");
    });

    it("should perform correct xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0], _out: 0 }, // 0x0000 ^ 0x0000 = 0x0000
        { _in: [0, 65535], _out: 65535 }, // 0x0000 ^ 0xFFFF = 0xFFFF
        { _in: [65535, 0], _out: 65535 }, // 0xFFFF ^ 0x0000 = 0xFFFF
        { _in: [65535, 65535], _out: 0 }, // 0xFFFF ^ 0xFFFF = 0x0000
        { _in: [43690, 21845], _out: 65535 }, // 0xAAAA ^ 0x5555 = 0xFFFF
        { _in: [21845, 43690], _out: 65535 }, // 0x5555 ^ 0xAAAA = 0xFFFF
        { _in: [61680, 3855], _out: 65535 }, // 0xF0F0 ^ 0x0F0F = 0xFFFF
        { _in: [255, 65280], _out: 65535 }, // 0x00FF ^ 0xFF00 = 0xFFFF
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { _in: [65536, 0] }, // exceeds 16-bit range
        { _in: [0, 65536] }, // exceeds 16-bit range
        { _in: [131072, 1000] }, // exceeds 16-bit range
        { _in: [-1, 0] }, // negative value
        { _in: [0, -1] }, // negative value
        { _in: [-100, -200] }, // negative values
      ];

      for (const { _in } of testCases) {
        await circuit.expectFail({ in: _in });
      }
    });
  });

  describe("3 inputs, 16-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["3", "16"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXorOptimized",
        {
          templateParams: ["3", "16"],
        },
      );
      circuit.setConstraint("3x8-bit xor operation");
      circuitOptimized.setConstraint("optimized 3x8-bit xor operation");
    });

    it("should perform correct multi-Xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0], _out: 0 }, // 0x0000 ^ 0x0000 ^ 0x0000 = 0x0000
        { _in: [0, 0, 65535], _out: 65535 }, // 0x0000 ^ 0x0000 ^ 0xFFFF = 0xFFFF
        { _in: [65535, 65535, 65535], _out: 65535 }, // 0xFFFF ^ 0xFFFF ^ 0xFFFF = 0xFFFF
        { _in: [43690, 21845, 4369], _out: 61166 }, // 0xAAAA ^ 0x5555 ^ 0x1111 = 0xEEEE
        { _in: [61680, 3855, 240], _out: 65295 }, // 0xF0F0 ^ 0x0F0F ^ 0x00F0 = 0xFF0F
        { _in: [255, 65280, 15], _out: 65520 }, // 0x00FF ^ 0xFF00 ^ 0x000F = 0xFFF0
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
        await circuitOptimized.expectPass({ in: _in }, { out: _out });
      }
    });
  });

  describe("5 inputs, 16-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["5", "16"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXorOptimized",
        {
          templateParams: ["5", "16"],
        },
      );
      circuit.setConstraint("5x16-bit xor operation");
      circuitOptimized.setConstraint("optimized 5x16-bit xor operation");
    });

    it("should perform correct multi-Xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0, 0, 0], _out: 0 }, // All zeros
        { _in: [65535, 65535, 65535, 65535, 65535], _out: 65535 }, // Odd number of all 1s = 0xFFFF
        { _in: [65535, 65535, 65535, 65535, 0], _out: 0 }, // Even number of all 1s = 0x0000
        { _in: [43690, 21845, 4369, 17476, 8738], _out: 34952 }, // 0xAAAA ^ 0x5555 ^ 0x1111 ^ 0x4444 ^ 0x2222 = 0x8888
        { _in: [255, 65280, 15, 61440, 240], _out: 3840 }, // 0x00FF ^ 0xFF00 ^ 0x000F ^ 0xF000 ^ 0x00F0 = 0x0F00
        { _in: [1, 2, 4, 8, 16], _out: 31 }, // 2^0 ^ 2^1 ^ 2^2 ^ 2^3 ^ 2^4 = 0x001F
        { _in: [32, 64, 128, 256, 512], _out: 992 }, // 2^5 ^ 2^6 ^ 2^7 ^ 2^8 ^ 2^9 = 0x03E0
        { _in: [4369, 4369, 4369, 4369, 4369], _out: 4369 }, // Odd number of same values
        { _in: [21845, 21845, 21845, 21845, 0], _out: 0 }, // Even number of same values
        { _in: [61680, 3855, 240, 15, 61695], _out: 4095 }, // 0xF0F0 ^ 0x0F0F ^ 0x00F0 ^ 0x000F ^ 0xF0FF = 0x0FFF
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
        await circuitOptimized.expectPass({ in: _in }, { out: _out });
      }
    });
  });

  describe("10 inputs, 4-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["10", "4"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXorOptimized",
        {
          templateParams: ["10", "4"],
        },
      );
      circuit.setConstraint("10x4-bit xor operation");
      circuitOptimized.setConstraint("optimized 10x4-bit xor operation");
    });

    it("should perform correct multi-Xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], _out: 0 }, // All zeros
        { _in: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15], _out: 0 }, // Even number of all 1s (0xF) = 0x0
        { _in: [15, 15, 15, 15, 15, 15, 15, 15, 15, 0], _out: 15 }, // Odd number of all 1s (0xF) = 0xF
        { _in: [1, 2, 4, 8, 1, 2, 4, 8, 1, 2], _out: 3 }, // Powers of 2 pattern
        { _in: [10, 5, 3, 12, 6, 9, 15, 0, 1, 7], _out: 6 }, // 0xA ^ 0x5 ^ 0x3 ^ 0xC ^ 0x6 ^ 0x9 ^ 0xF ^ 0x0 ^ 0x1 ^ 0x7 = 0x8
        { _in: [15, 0, 15, 0, 15, 0, 15, 0, 15, 0], _out: 15 }, // Alternating pattern (5 times 0xF)
        { _in: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7], _out: 0 }, // Even number of same values
        { _in: [5, 5, 5, 5, 5, 5, 5, 5, 5, 0], _out: 5 }, // Odd number of same values
        { _in: [1, 1, 2, 2, 4, 4, 8, 8, 0, 0], _out: 0 }, // Paired values cancel out
        { _in: [8, 4, 2, 1, 8, 4, 2, 1, 8, 4], _out: 12 }, // Repeated pattern with extra
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
        await circuitOptimized.expectPass({ in: _in }, { out: _out });
      }
    });
  });

  describe("2 inputs, 32-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["2", "32"],
        },
      );
      circuit.setConstraint("2x32-bit xor operation");
    });

    it("should perform correct multi-Xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0], _out: 0 }, // 0x00000000 ^ 0x00000000 = 0x00000000
        { _in: [0, 4294967295], _out: 4294967295 }, // 0x00000000 ^ 0xFFFFFFFF = 0xFFFFFFFF
        { _in: [4294967295, 0], _out: 4294967295 }, // 0xFFFFFFFF ^ 0x00000000 = 0xFFFFFFFF
        { _in: [4294967295, 4294967295], _out: 0 }, // 0xFFFFFFFF ^ 0xFFFFFFFF = 0x00000000
        { _in: [2863311530, 1431655765], _out: 4294967295 }, // 0xAAAAAAAA ^ 0x55555555 = 0xFFFFFFFF
        { _in: [1431655765, 2863311530], _out: 4294967295 }, // 0x55555555 ^ 0xAAAAAAAA = 0xFFFFFFFF
        { _in: [4042322160, 252645135], _out: 4294967295 }, // 0xF0F0F0F0 ^ 0x0F0F0F0F = 0xFFFFFFFF
        { _in: [65535, 4294901760], _out: 4294967295 }, // 0x0000FFFF ^ 0xFFFF0000 = 0xFFFFFFFF
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should reject out-of-range values", async function (): Promise<void> {
      const testCases = [
        { _in: [4294967296, 0] }, // exceeds 32-bit range
        { _in: [0, 4294967296] }, // exceeds 32-bit range
        { _in: [8589934592, 1000] }, // exceeds 32-bit range
        { _in: [-1, 0] }, // negative value
        { _in: [0, -1] }, // negative value
        { _in: [-1000, -2000] }, // negative values
      ];

      for (const { _in } of testCases) {
        await circuit.expectFail({ in: _in });
      }
    });
  });

  describe("3 inputs, 32-bit Xor Operations", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXor",
        {
          templateParams: ["3", "32"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "BitwiseXorOptimized",
        {
          templateParams: ["3", "32"],
        },
      );
      circuit.setConstraint("3x32-bit xor operation");
      circuitOptimized.setConstraint("optimized 3x32-bit xor operation");
    });

    it("should perform correct multi-Xor operations", async function (): Promise<void> {
      const testCases = [
        { _in: [0, 0, 0], _out: 0 }, // 0x00000000 ^ 0x00000000 ^ 0x00000000 = 0x00000000
        { _in: [0, 0, 4294967295], _out: 4294967295 }, // 0x00000000 ^ 0x00000000 ^ 0xFFFFFFFF = 0xFFFFFFFF
        { _in: [4294967295, 4294967295, 4294967295], _out: 4294967295 }, // 0xFFFFFFFF ^ 0xFFFFFFFF ^ 0xFFFFFFFF = 0xFFFFFFFF
        { _in: [2863311530, 1431655765, 286331153], _out: 4008636142 }, // 0xAAAAAAAA ^ 0x55555555 ^ 0x11111111 = 0xEEEEEEEE
        { _in: [4042322160, 252645135, 240], _out: 4294967055 }, // 0xF0F0F0F0 ^ 0x0F0F0F0F ^ 0x000000F0 = 0xFFFFFF0F
        { _in: [65535, 4294901760, 15], _out: 4294967280 }, // 0x0000FFFF ^ 0xFFFF0000 ^ 0x0000000F = 0xFFFFFFF0
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
        await circuitOptimized.expectPass({ in: _in }, { out: _out });
      }
    });
  });
});

describe("ByteAdder Circuits", function () {
  describe("Byte Adder Circuit", function () {
    let circuit: WitnessTester<["a", "b", "carry_in"], ["c", "carry_out"]>;

    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "ByteAdder",
      );
      circuit.setConstraint("byte adder");
    });

    it("should correctly add bytes without carry", async function (): Promise<void> {
      const testCases = [
        { a: 0x01, b: 0x02, carry_in: 0, c: 0x03, carry_out: 0 },
        { a: 0x10, b: 0x20, carry_in: 0, c: 0x30, carry_out: 0 },
        { a: 0x7f, b: 0x7f, carry_in: 0, c: 0xfe, carry_out: 0 },
        { a: 0x00, b: 0x00, carry_in: 0, c: 0x00, carry_out: 0 },
        { a: 0x00, b: 0x00, carry_in: 1, c: 0x01, carry_out: 0 },
      ];

      for (const { a, b, carry_in, c, carry_out } of testCases) {
        await circuit.expectPass({ a, b, carry_in }, { c, carry_out });
      }
    });

    it("should correctly handle carry generation", async function (): Promise<void> {
      const testCases = [
        { a: 0xff, b: 0x01, carry_in: 0, c: 0x00, carry_out: 1 },
        { a: 0x80, b: 0x80, carry_in: 0, c: 0x00, carry_out: 1 },
        { a: 0xfe, b: 0x01, carry_in: 1, c: 0x00, carry_out: 1 },
        { a: 0xff, b: 0x00, carry_in: 1, c: 0x00, carry_out: 1 },
        { a: 0xff, b: 0xff, carry_in: 1, c: 0xff, carry_out: 1 },
      ];

      for (const { a, b, carry_in, c, carry_out } of testCases) {
        await circuit.expectPass({ a, b, carry_in }, { c, carry_out });
      }
    });

    it("should handle edge cases", async function (): Promise<void> {
      const testCases = [
        { a: 0x00, b: 0xff, carry_in: 0, c: 0xff, carry_out: 0 },
        { a: 0xff, b: 0x00, carry_in: 0, c: 0xff, carry_out: 0 },
        { a: 0x7f, b: 0x80, carry_in: 1, c: 0x00, carry_out: 1 },
        { a: 0x55, b: 0xaa, carry_in: 1, c: 0x00, carry_out: 1 },
      ];

      for (const { a, b, carry_in, c, carry_out } of testCases) {
        await circuit.expectPass({ a, b, carry_in }, { c, carry_out });
      }
    });
  });
});

describe("Byte16ToBit128 Circuit", function () {
  let circuit: WitnessTester<["bytes"], ["bits"]>;

  describe("Bytes to Bits Conversion for GF(2^128)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "Byte16ToBit128",
      );
      circuit.setConstraint("16-byte to 128 bits conversion");
    });

    it("should correctly convert all zero bytes", async function (): Promise<void> {
      const bytes = new Array(16).fill(0);
      const bits = new Array(128).fill(0);

      await circuit.expectPass({ bytes }, { bits });
    });

    it("should put MSB of first byte to bit 0", async function (): Promise<void> {
      const bytes = new Array(16).fill(0);
      bytes[0] = 0x80;

      const bits = new Array(128).fill(0);
      bits[0] = 1;

      await circuit.expectPass({ bytes }, { bits });
    });

    it("should put LSB of first byte to bit 7", async function (): Promise<void> {
      const bytes = new Array(16).fill(0);
      bytes[0] = 0x01;

      const bits = new Array(128).fill(0);
      bits[7] = 1;

      await circuit.expectPass({ bytes }, { bits });
    });
  });
});

describe("Bit128ToByte16 Circuit", function () {
  let circuit: WitnessTester<["bits"], ["bytes"]>;

  describe("Bits to Bytes Conversion for GF(2^128)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "Bit128ToByte16",
      );
      circuit.setConstraint("128 bits to 16-byte conversion");
    });

    it("should correctly convert all zero bits", async function (): Promise<void> {
      const bits = new Array(128).fill(0);
      const bytes = new Array(16).fill(0);

      await circuit.expectPass({ bits }, { bytes });
    });

    it("should put bit 0 to MSB of first byte", async function (): Promise<void> {
      const bits = new Array(128).fill(0);
      bits[0] = 1;

      const bytes = new Array(16).fill(0);
      bytes[0] = 0x80;

      await circuit.expectPass({ bits }, { bytes });
    });

    it("should put bit 7 to LSB of first byte", async function (): Promise<void> {
      const bits = new Array(128).fill(0);
      bits[7] = 1;

      const bytes = new Array(16).fill(0);
      bytes[0] = 0x01;

      await circuit.expectPass({ bits }, { bytes });
    });
  });
});

describe("Byte16ToNum Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("16-byte to 128-bit Number Conversion", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "Byte16ToNum",
      );
      circuit.setConstraint("16-byte to 128-bit conversion");
    });

    it("should convert minimum and maximum value correctly", async function (): Promise<void> {
      const testCases = [
        {
          _in: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          _out: 0,
        },
        {
          _in: [
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff,
          ],
          _out: BigInt(2) ** BigInt(128) - BigInt(1),
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should convert MSB patterns correctly", async function (): Promise<void> {
      const testCases = [
        {
          _in: [
            0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00,
          ],
          _out: 1,
        },
        {
          _in: [
            0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00,
          ],
          _out: BigInt(2) ** BigInt(8),
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should convert LSB patterns correctly", async function (): Promise<void> {
      const testCases = [
        {
          // LSB set: [..., 0x01] should equal 2^127
          _in: [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01,
          ],
          _out: BigInt(2) ** BigInt(127),
        },
        {
          // Second-to-last bit: [..., 0x02]
          _in: [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x02,
          ],
          _out: BigInt(2) ** BigInt(126),
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });
  });
});

describe("NumToByte16 Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("128-bit Number to 16-byte Conversion", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/bits.circom",
        "NumToByte16",
      );
      circuit.setConstraint("128-bit to 16-byte conversion");
    });

    it("should convert minimum and maximum value correctly", async function (): Promise<void> {
      const testCases = [
        {
          _in: 0,
          _out: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          _in: BigInt(2) ** BigInt(128) - BigInt(1),
          _out: [
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff,
          ],
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should convert small numbers correctly", async function (): Promise<void> {
      const testCases = [
        {
          _in: 1,
          _out: [
            0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00,
          ],
        },
        {
          _in: 2,
          _out: [
            0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00,
          ],
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should convert powers of 2 correctly", async function (): Promise<void> {
      const testCases = [
        {
          _in: BigInt(2) ** BigInt(127),
          _out: [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01,
          ],
        },
        {
          _in: BigInt(2) ** BigInt(120),
          _out: [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x80,
          ],
        },
        {
          _in: BigInt(2) ** BigInt(56),
          _out: [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00,
          ],
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });
  });
});
