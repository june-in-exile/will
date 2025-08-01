import { WitnessTester } from "./util/index.js";
import { AESGCM, AESUtils, GaloisField, GF128 } from "./logic/index.js";

describe("GF8Mul2 Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Galois Field Multiplication by 2 in GF(2^8)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/galoisField.circom",
        "GF8Mul2",
      );
      circuit.setConstraint("GF(2^8) multiplication by 2");
    });

    it("should correctly multiply by 2 for random values", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
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
        "circuits/shared/components/aes-gcm/galoisField.circom",
        "GF8Mul3",
      );
      circuit.setConstraint("GF(2^8) multiplication by 3");
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

describe("GF128Multiply Circuit", function () {
  let circuit: WitnessTester<["aBytes", "bBytes"], ["cBytes"]>;
  let circuitOptimized: WitnessTester<["aBytes", "bBytes"], ["cBytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/aes-gcm/galoisField.circom",
      "GF128Multiply",
    );
    circuitOptimized = await WitnessTester.construct(
      "circuits/shared/components/aes-gcm/galoisField.circom",
      "GF128MultiplyOptimized",
    );
    circuit.setConstraint("GF(2^128) multiplication");
    circuitOptimized.setConstraint("optimized GF(2^128) multiplication");
  });

  it("should correctly multiply by zero and yield zero", async function (): Promise<void> {
    const aBytes = new Array(16).fill(0x00);
    const bBytes = [
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98,
      0x76, 0x54, 0x32, 0x10,
    ];

    const cBytes = new Array(16).fill(0x00);

    await circuit.expectPass({ aBytes, bBytes }, { cBytes });
    await circuitOptimized.expectPass({ aBytes, bBytes }, { cBytes });
  });

  it("should correctly multiply by one and yield unchanged multiplicant", async function (): Promise<void> {
    const aBytes = [
      0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ]; // "1" in GF(2^128)
    const bBytes = [
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98,
      0x76, 0x54, 0x32, 0x10,
    ];

    // Multiplying by 1 should return b unchanged
    const cBytes = [...bBytes];

    await circuit.expectPass({ aBytes, bBytes }, { cBytes });
    await circuitOptimized.expectPass({ aBytes, bBytes }, { cBytes });
  });

  it("should handle vectors commonly used in GHASH", async function (): Promise<void> {
    const aBytes = [
      0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b, 0x88, 0x4c, 0xfa, 0x59,
      0xca, 0x34, 0x2b, 0x2e,
    ];
    const bBytes = [
      0x03, 0x88, 0xda, 0xce, 0x60, 0xb6, 0xa3, 0x92, 0xf3, 0x28, 0xc2, 0xb9,
      0x71, 0xb2, 0xfe, 0x78,
    ];

    const cBytes = Array.from(
      GF128.multiply(Buffer.from(aBytes), Buffer.from(bBytes)),
    );

    // console.info("Result after reduction:", cBytes.map(b => b.toString(16).padStart(2, '0')).join(' '));
    await circuit.expectPass({ aBytes, bBytes }, { cBytes });
    await circuitOptimized.expectPass({ aBytes, bBytes }, { cBytes });
  });
});

describe("GHash Circuit", function () {
  let circuit: WitnessTester<["data", "hashKey"], ["result"]>;
  let circuitOptimized: WitnessTester<["data", "hashKey"], ["result"]>;
  const HASH_KEY = [
    0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b, 0x88, 0x4c, 0xfa, 0x59,
    0xca, 0x34, 0x2b, 0x2e,
  ];

  describe("GHASH with 1 block (16 bytes)", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/galoisField.circom",
        "GHash",
        {
          templateParams: ["1"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/galoisField.circom",
        "GHashOptimized",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("1-block GHASH");
      circuitOptimized.setConstraint("optimized 1-block GHASH");
    });

    it("should compute GHASH for simple sequential data", async function (): Promise<void> {
      const data = Array.from({ length: 16 }, (_, i) => i + 1);
      const hashKey = HASH_KEY;

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(HASH_KEY)),
      );

      await circuit.expectPass({ data, hashKey }, { result });
      await circuitOptimized.expectPass({ data, hashKey }, { result });
    });

    it("should compute GHASH for all zeros data and yield all zeros", async function (): Promise<void> {
      const data = new Array(16).fill(0x00);
      const hashKey = HASH_KEY;

      const result = new Array(16).fill(0x00);

      await circuit.expectPass({ data, hashKey }, { result });
      await circuitOptimized.expectPass({ data, hashKey }, { result });
    });

    it("should compute GHASH for random data and key", async function (): Promise<void> {
      const data = Array.from(AESUtils.randomBytes(16));
      const hashKey = Array.from(AESUtils.randomBytes(16));

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey)),
      );

      await circuit.expectPass({ data, hashKey }, { result });
      await circuitOptimized.expectPass({ data, hashKey }, { result });
    });
  });

  describe("GHASH with 2 blocks (32 bytes)", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/galoisField.circom",
        "GHash",
        {
          templateParams: ["2"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/galoisField.circom",
        "GHashOptimized",
        {
          templateParams: ["2"],
        },
      );
      circuit.setConstraint("2-block GHASH");
      circuitOptimized.setConstraint("optimized 2-block GHASH");
    });

    it("should compute GHASH for sequential data across two blocks", async function (): Promise<void> {
      const data = Array.from({ length: 32 }, (_, i) => i);
      const hashKey = HASH_KEY;

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(HASH_KEY)),
      );

      await circuit.expectPass({ data, hashKey }, { result });
      await circuitOptimized.expectPass({ data, hashKey }, { result });
    });

    it("should compute GHASH for first block zeros, second block ones", async function (): Promise<void> {
      const data = [...new Array(16).fill(0x00), ...new Array(16).fill(0xff)];
      const hashKey = Array.from(AESUtils.randomBytes(16));

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey)),
      );

      await circuit.expectPass({ data, hashKey }, { result });
      await circuitOptimized.expectPass({ data, hashKey }, { result });
    });

    it("should compute GHASH for random data and key", async function (): Promise<void> {
      const data = Array.from(AESUtils.randomBytes(32));
      const hashKey = Array.from(AESUtils.randomBytes(16));

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey)),
      );

      await circuit.expectPass({ data, hashKey }, { result });
      await circuitOptimized.expectPass({ data, hashKey }, { result });
    });
  });

  describe("GHASH with 4 blocks (64 bytes)", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/galoisField.circom",
        "GHash",
        {
          templateParams: ["4"],
        },
      );
      circuitOptimized = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/galoisField.circom",
        "GHashOptimized",
        {
          templateParams: ["4"],
        },
      );
      circuit.setConstraint("4-block GHASH");
      circuitOptimized.setConstraint("optimized 4-block GHASH");
    });

    it("should compute GHASH for random data and key", async function (): Promise<void> {
      const data = Array.from(AESUtils.randomBytes(64));
      const hashKey = Array.from(AESUtils.randomBytes(16));

      const result = Array.from(
        AESGCM.ghash(Buffer.from(data), Buffer.from(hashKey)),
      );

      await circuit.expectPass({ data, hashKey }, { result });
      await circuitOptimized.expectPass({ data, hashKey }, { result });
    });
  });
});
