import { WitnessTester } from "./utils";
import { GaloisField } from "./helpers";

describe("GFMul2 Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Galois Field Multiplication by 2 in GF(2^8)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256ctr/galoisField.circom",
        "GFMul2",
      );
      console.info(
        "GFMul2 circuit constraints:",
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

describe("GFMul3 Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;
  describe("Galois Field Multiplication by 3 in GF(2^8)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256ctr/galoisField.circom",
        "GFMul3",
      );
      console.info(
        "GFMul3 circuit constraints:",
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

    it("should verify relationship with GFMul2", async function (): Promise<void> {
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
