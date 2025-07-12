import { WitnessTester } from "./utils";
import { AESUtils, mixColumn, mixColumns } from "./helpers";

describe.only("MixColumn Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("MixColumns Transformation for a Single Column", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/mixColumns.circom",
        "MixColumn",
      );
      console.info(
        "MixColumn circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it.only("should correctly transform random columns", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(4));

        await circuit.expectPass({ in: _in }, { out: mixColumn(_in as Byte4) });
      }
    });

    it("should handle known test vectors correctly", async function (): Promise<void> {
      const testCases = [
        {
          _in: [0x00, 0x00, 0x00, 0x00], // Zero column
          _out: [0x00, 0x00, 0x00, 0x00],
        },
        {
          _in: [0x01, 0x01, 0x01, 0x01], // All ones
          _out: [0x06, 0x06, 0x06, 0x06],
        },
        {
          _in: [0xff, 0xff, 0xff, 0xff], // All 0xff
          _out: mixColumn([0xff, 0xff, 0xff, 0xff]),
        },
        {
          _in: [0x01, 0x00, 0x00, 0x00], // Unit vector e1
          _out: [0x02, 0x01, 0x01, 0x03],
        },
        {
          _in: [0x00, 0x01, 0x00, 0x00], // Unit vector e2
          _out: [0x03, 0x02, 0x01, 0x01],
        },
        {
          _in: [0x00, 0x00, 0x01, 0x00], // Unit vector e3
          _out: [0x01, 0x03, 0x02, 0x01],
        },
        {
          _in: [0x00, 0x00, 0x00, 0x01], // Unit vector e4
          _out: [0x01, 0x01, 0x03, 0x02],
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle edge cases", async function (): Promise<void> {
      const columns = [
        [0x80, 0x80, 0x80, 0x80], // MSB set values
        [0x7f, 0x7f, 0x7f, 0x7f], // Just below MSB
        [0xaa, 0x55, 0xaa, 0x55], // Alternating pattern
        [0x53, 0xca, 0x17, 0x8e], // Mixed complex values
      ];

      for (const col of columns) {
        await circuit.expectPass({ in: col }, { out: mixColumn(col as Byte4) });
      }
    });
  });
});

describe("MixColumns Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("MixColumns Transformation for the Entire 16-byte State", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/mixColumns.circom",
        "MixColumns",
      );
      console.info(
        "MixColumns circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should correctly transform random states", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass(
          { in: _in },
          { out: mixColumns(_in as Byte16) },
        );
      }
    });

    it("should handle known AES test vectors", async function (): Promise<void> {
      const testCases = [
        {
          _in: new Array(16).fill(0), // Zero state
          _out: new Array(16).fill(0),
        },
        {
          _in: new Array(16).fill(0x01), // All ones state
          _out: mixColumns(new Array(16).fill(0x01) as Byte16),
        },
        {
          _in: [
            // AES FIPS 197 example
            0xd4, // Column 0
            0xe0,
            0xb8,
            0x1e,
            0xbf, // Column 1
            0xb4,
            0x41,
            0x27,
            0x5d, // Column 2
            0x52,
            0x11,
            0x98,
            0x30, // Column 3
            0xae,
            0xf1,
            0xe5,
          ],
          _out: mixColumns([
            0xd4, 0xe0, 0xb8, 0x1e, 0xbf, 0xb4, 0x41, 0x27, 0x5d, 0x52, 0x11,
            0x98, 0x30, 0xae, 0xf1, 0xe5,
          ]),
        },
        {
          _in: [
            // Identity-like state
            0x01, // Col 0: e1
            0x00,
            0x00,
            0x00,
            0x00, // Col 1: e2
            0x01,
            0x00,
            0x00,
            0x00, // Col 2: e3
            0x00,
            0x01,
            0x00,
            0x00, // Col 3: e4
            0x00,
            0x00,
            0x01,
          ],
          _out: [
            0x02, 0x01, 0x01, 0x03, 0x03, 0x02, 0x01, 0x01, 0x01, 0x03, 0x02,
            0x01, 0x01, 0x01, 0x03, 0x02,
          ],
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle edge cases for full state", async function (): Promise<void> {
      const testCases = [
        {
          _in: new Array(16).fill(0xff), // All maximum values
        },
        {
          _in: new Array(16).fill(0x80), // MSB set pattern
        },
        {
          _in: Array.from({ length: 16 }, (_, i) =>
            i % 2 === 0 ? 0xaa : 0x55,
          ), // Alternating pattern across state
        },
        {
          _in: Array.from({ length: 16 }, (_, i) => i * 0x11), // Sequential values
        },
      ];

      for (const { _in } of testCases) {
        await circuit.expectPass(
          { in: _in },
          { out: mixColumns(_in as Byte16) },
        );
      }
    });
  });
});
