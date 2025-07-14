import { WitnessTester } from "./utils";
import { GaloisField, AESUtils, AESGCM, GF128 } from "./helpers";

describe("GF8Mul2 Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Galois Field Multiplication by 2 in GF(2^8)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256ctr/galoisField.circom",
        "GF8Mul2",
      );
      console.info(
        "GF8Mul2 circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should correctly multiply by 2 for random values", async function (): Promise<void> {
      for (let i = 0; i < 20; i++) {
        const input = Math.floor(Math.random() * 256);

        await circuit.expectPass(
          { in: input },
          { out: GaloisField.multiply(input, 2) },
        );
      }
    });

    it("should handle known test vectors correctly", async function (): Promise<void> {
      const testCases = [
        { _in: 0x00, _out: 0x00 }, // 0 * 2 = 0
        { _in: 0x01, _out: 0x02 }, // 1 * 2 = 2
        { _in: 0x02, _out: 0x04 }, // 2 * 2 = 4
        { _in: 0x40, _out: 0x80 }, // No reduction needed
        { _in: 0x80, _out: 0x1b }, // MSB set, reduction needed
        { _in: 0x81, _out: 0x19 }, // 0x1b ^ 0x02
        { _in: 0xff, _out: 0xe5 }, // All bits set
        { _in: 0x53, _out: 0xa6 }, // No reduction
        { _in: 0xca, _out: 0x8f }, // With reduction
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle boundary values that trigger polynomial reduction (MSB = 1)", async function (): Promise<void> {
      const bytes = [0x80, 0x81, 0xaa, 0xcc, 0xff];

      for (const byte of bytes) {
        await circuit.expectPass(
          { in: byte },
          { out: GaloisField.multiply(byte, 2) },
        );
      }
    });
  });
});

describe("GF8Mul3 Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;
  describe("Galois Field Multiplication by 3 in GF(2^8)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256ctr/galoisField.circom",
        "GF8Mul3",
      );
      console.info(
        "GF8Mul3 circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should correctly multiply by 3 for random values", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const input = Math.floor(Math.random() * 256);

        await circuit.expectPass(
          { in: input },
          { out: GaloisField.multiply(input, 3) },
        );
      }
    });

    it("should handle known test vectors correctly", async function (): Promise<void> {
      const testCases = [
        { _in: 0x00, _out: 0x00 }, // 0 * 3 = 0
        { _in: 0x01, _out: 0x03 }, // 1 * 3 = 3
        { _in: 0x02, _out: 0x06 }, // 2 * 3 = 6
        { _in: 0x80, _out: 0x9b }, // MSB cases
        { _in: 0x81, _out: 0x98 }, // 0x19 ^ 0x81
        { _in: 0xff, _out: 0x1a }, // All bits set
        { _in: 0x53, _out: 0xf5 }, // Mixed case
        { _in: 0xca, _out: 0x45 }, // Complex case
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should verify relationship with GF8Mul2", async function (): Promise<void> {
      // Property: 3 * x = (2 * x) ⊕ x
      const bytes = [0x00, 0x01, 0x10, 0x53, 0x80, 0xff];

      for (const byte of bytes) {
        await circuit.expectPass(
          { in: byte },
          { out: GaloisField.multiply(byte, 2) ^ byte },
        );
      }
    });

    it("should handle edge cases", async function (): Promise<void> {
      const bytes = [
        0x00, // Zero
        0x01, // Identity-like
        0x55, // Alternating bits
        0xaa, // Inverse alternating bits
        0x7f, // Just below MSB threshold
        0x80, // MSB threshold
      ];

      for (const byte of bytes) {
        await circuit.expectPass(
          { in: byte },
          { out: GaloisField.multiply(byte, 3) },
        );
      }
    });
  });
});

describe.skip("GF128Multiply Circuit", function () {
  let circuit: WitnessTester<["a", "b"], ["c"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/aes256ctr/galoisField.circom",
      "GF128Multiply",
    );
    console.info(
      "GF128 multiplication circuit constraints:",
      await circuit.getConstraintCount(),
    );
  });

  it("should correctly multiply by zero and yield zero", async function (): Promise<void> {
    const a = new Array(16).fill(0x00);
    const b = [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
      0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10];

    const c = new Array(16).fill(0x00);

    await circuit.expectPass(
      { a, b },
      { c }
    );
  });

  it("should correctly multiply by one", async function (): Promise<void> {
    // In GF(2^128), "1" is represented as 0x80000...0 (MSB set)
    const a = [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const b = [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
      0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10];

    // Multiplying by 1 should return b unchanged
    const c = [...b];

    await circuit.expectPass(
      { a, b },
      { c }
    );
  });

  it("should handle vectors commonly used in GHASH", async function (): Promise<void> {
    const a = [0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b,
      0x88, 0x4c, 0xfa, 0x59, 0xca, 0x34, 0x2b, 0x2e];
    const b = [0x03, 0x88, 0xda, 0xce, 0x60, 0xb6, 0xa3, 0x92,
      0xf3, 0x28, 0xc2, 0xb9, 0x71, 0xb2, 0xfe, 0x78];

    const c = Array.from(GF128.multiply(Buffer.from(a), Buffer.from(b)));

    await circuit.expectPass(
      { a, b },
      { c }
    );
  });

  it.skip("should handle reduction polynomial correctly", async function (): Promise<void> {
    // Test case that triggers the reduction polynomial
    // When shifting causes a carry, we XOR with 0xE1
    const a = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];
    const b = [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

    // This should trigger reduction: shifting b right by 1 creates a carry
    const c = Array.from(GF128.multiply(Buffer.from(a), Buffer.from(b)));

    await circuit.expectPass(
      { a, b },
      { c }
    );

    // The result should have 0xE1 in the first byte due to reduction
    console.log("Result after reduction:", c.map(b => b.toString(16).padStart(2, '0')).join(' '));
  });
});

describe.skip("GHash Circuit", function () {
  let circuit: WitnessTester<["data", "hashKey"], ["result"]>;

  describe("GHASH with 1 block (16 bytes)", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256ctr/galoisField.circom",
        "GHash",
        {
          templateParams: ["1"],
        },
      );
      console.info(
        "GHASH (1 block) circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should compute GHASH for simple sequential data", async function (): Promise<void> {
      const data = Array.from({ length: 16 }, (_, i) => i + 1);
      const hashKey = [
        0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b,
        0x88, 0x4c, 0xfa, 0x59, 0xca, 0x34, 0x2b, 0x2e
      ];

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey))
      );

      await circuit.expectPass(
        { data, hashKey },
        { result }
      );
    });

    it("should compute GHASH for all zeros data and yield all zeros", async function (): Promise<void> {
      const data = new Array(16).fill(0x00);
      const hashKey = Array.from(AESUtils.randomBytes(16));
      const result = new Array(16).fill(0x00);

      await circuit.expectPass(
        { data, hashKey },
        { result }
      );
    });

    it("should compute GHASH for random data and key", async function (): Promise<void> {
      const data = Array.from(AESUtils.randomBytes(16));
      const hashKey = Array.from(AESUtils.randomBytes(16));
      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey))
      );

      await circuit.expectPass(
        { data, hashKey },
        { result }
      );
    });
  });

  describe("GHASH with 2 blocks (32 bytes)", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/computeJ0.circom",
        "GHash",
        {
          templateParams: ["2"],
        },
      );
      console.info(
        "GHASH (2 blocks) circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should compute GHASH for sequential data across two blocks", async function (): Promise<void> {
      const data = Array.from({ length: 32 }, (_, i) => i);
      const hashKey = [
        0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b,
        0x88, 0x4c, 0xfa, 0x59, 0xca, 0x34, 0x2b, 0x2e
      ];

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey))
      );

      await circuit.expectPass(
        { data, hashKey },
        { result }
      );
    });

    it("should compute GHASH for first block zeros, second block ones", async function (): Promise<void> {
      const data = [
        ...new Array(16).fill(0x00),
        ...new Array(16).fill(0xff)
      ];
      const hashKey = Array.from(AESUtils.randomBytes(16));
      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey))
      );

      await circuit.expectPass(
        { data, hashKey },
        { result }
      );
    });

    it("should compute GHASH for random data", async function (): Promise<void> {
      const data = Array.from(AESUtils.randomBytes(32));
      const hashKey = Array.from(AESUtils.randomBytes(16));
      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey))
      );

      await circuit.expectPass(
        { data, hashKey },
        { result }
      );
    });

    it.skip("should demonstrate GHASH accumulation", async function (): Promise<void> {
      // This test shows how GHASH accumulates results across blocks
      const block1 = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10];
      const block2 = [0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
        0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20];
      const data = [...block1, ...block2];

      const hashKey = [
        0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x11, 0x22,
        0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0x00
      ];

      // Calculate expected result using TypeScript implementation
      const expectedResult = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey))
      );

      await circuit.expectPass(
        { data: data, hashKey: hashKey },
        { result: expectedResult }
      );

      console.log("GHASH accumulation example:");
      console.log("Block 1:", block1.map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log("Block 2:", block2.map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log("Result:", expectedResult.map(b => b.toString(16).padStart(2, '0')).join(' '));
    });
  });

  describe("GHASH with 4 blocks (64 bytes)", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/computeJ0.circom",
        "GHash",
        {
          templateParams: ["4"],
        },
      );
      console.info(
        "GHASH (4 blocks) circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should compute GHASH for pattern data", async function (): Promise<void> {
      const pattern = [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
        0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10];
      const data = [...pattern, ...pattern, ...pattern, ...pattern];

      const hashKey = [
        0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b,
        0x88, 0x4c, 0xfa, 0x59, 0xca, 0x34, 0x2b, 0x2e
      ];

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey))
      );

      await circuit.expectPass(
        { data, hashKey },
        { result }
      );
    });

    it("should handle mixed block patterns", async function (): Promise<void> {
      const block1 = new Array(16).fill(0xaa);
      const block2 = new Array(16).fill(0x55);
      const block3 = Array.from({ length: 16 }, (_, i) => i);
      const block4 = Array.from({ length: 16 }, (_, i) => 0xff - i);
      const data = [...block1, ...block2, ...block3, ...block4];

      const hashKey = Array.from(AESUtils.randomBytes(16));
      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey))
      );

      await circuit.expectPass(
        { data, hashKey },
        { result }
      );
    });
  });
});