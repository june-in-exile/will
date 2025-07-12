import { WitnessTester } from "./utils";
import { AESUtils, mixColumn, mixColumns } from "./helpers";

describe("MixColumn Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("MixColumns Transformation for a Single Column", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/mixColumn.circom",
        "MixColumn",
      );
      console.info(
        "MixColumn circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should correctly transform random columns", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(4));

        await circuit.expectPass(
          { in: _in },
          { out: mixColumn(_in) },
        );
      }
    });

    it("should handle known test vectors correctly", async function (): Promise<void> {
      const testCases = [
        {
          _in: [0x00, 0x00, 0x00, 0x00],
          _out: [0x00, 0x00, 0x00, 0x00]  // Zero column
        },
        {
          _in: [0x01, 0x01, 0x01, 0x01],
          _out: mixColumn([0x01, 0x01, 0x01, 0x01])  // All ones
        },
        {
          _in: [0xff, 0xff, 0xff, 0xff],
          _out: mixColumn([0xff, 0xff, 0xff, 0xff])  // All 0xff
        },
        {
          _in: [0x01, 0x00, 0x00, 0x00],
          _out: [0x02, 0x01, 0x01, 0x03]  // Unit vector e1
        },
        {
          _in: [0x00, 0x01, 0x00, 0x00],
          _out: [0x03, 0x02, 0x01, 0x01]  // Unit vector e2
        },
        {
          _in: [0x00, 0x00, 0x01, 0x00],
          _out: [0x01, 0x03, 0x02, 0x01]  // Unit vector e3
        },
        {
          _in: [0x00, 0x00, 0x00, 0x01],
          _out: [0x01, 0x01, 0x03, 0x02]  // Unit vector e4
        },
        {
          _in: [0xd4, 0xbf, 0x5d, 0x30],  // AES test vector
          _out: mixColumn([0xd4, 0xbf, 0x5d, 0x30])
        }
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass(
          { in: _in },
          { out: _out },
        );
      }
    });

    it("should handle edge cases", async function (): Promise<void> {
      const testCases = [
        [0x80, 0x80, 0x80, 0x80],  // MSB set values
        [0x7f, 0x7f, 0x7f, 0x7f],  // Just below MSB
        [0xaa, 0x55, 0xaa, 0x55],  // Alternating pattern
        [0x53, 0xca, 0x17, 0x8e]   // Mixed complex values
      ];

      for (const col of testCases) {
        await circuit.expectPass(
          { in: col },
          { out: mixColumn(col) },
        );
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
      for (let i = 0; i < 10; i++) {
        const _in = Array.from(AESUtils.randomBytes(16));
        const expectedOutput = mixColumns(inputState);

        await circuit.expectPass(
          { in: inputState },
          { out: expectedOutput },
        );
      }
    });

    it("should handle known AES test vectors", async function (): Promise<void> {
      const testVectors = [
        {
          name: "Zero state",
          input: new Array(16).fill(0),
          expected: new Array(16).fill(0)
        },
        {
          name: "All ones state",
          input: new Array(16).fill(0x01),
          expected: mixColumnsJS(new Array(16).fill(0x01))
        },
        {
          name: "AES FIPS 197 example",
          input: [
            0xd4, 0xe0, 0xb8, 0x1e,  // Column 0
            0xbf, 0xb4, 0x41, 0x27,  // Column 1  
            0x5d, 0x52, 0x11, 0x98,  // Column 2
            0x30, 0xae, 0xf1, 0xe5   // Column 3
          ],
          expected: mixColumnsJS([
            0xd4, 0xe0, 0xb8, 0x1e,
            0xbf, 0xb4, 0x41, 0x27,
            0x5d, 0x52, 0x11, 0x98,
            0x30, 0xae, 0xf1, 0xe5
          ])
        },
        {
          name: "Identity-like state",
          input: [
            0x01, 0x00, 0x00, 0x00,  // Col 0: e1
            0x00, 0x01, 0x00, 0x00,  // Col 1: e2
            0x00, 0x00, 0x01, 0x00,  // Col 2: e3
            0x00, 0x00, 0x00, 0x01   // Col 3: e4
          ],
          expected: [
            0x02, 0x01, 0x01, 0x03,  // MixColumn applied to each column
            0x03, 0x02, 0x01, 0x01,
            0x01, 0x03, 0x02, 0x01,
            0x01, 0x01, 0x03, 0x02
          ]
        }
      ];

      for (const { name, input, expected } of testVectors) {
        await circuit.expectPass(
          { in: input },
          { out: expected },
        );
      }
    });

    it("should process each column independently", async function (): Promise<void> {
      // Create a state where each column has a distinct pattern
      const state = [
        // Column 0: all same value
        0xaa, 0xaa, 0xaa, 0xaa,
        // Column 1: incremental
        0x00, 0x01, 0x02, 0x03,
        // Column 2: alternating
        0x55, 0xaa, 0x55, 0xaa,
        // Column 3: random
        0x12, 0x34, 0x56, 0x78
      ];

      const expected = mixColumnsJS(state);

      await circuit.expectPass(
        { in: state },
        { out: expected },
      );

      // Verify each column was processed correctly by checking individual columns
      for (let col = 0; col < 4; col++) {
        const offset = col * 4;
        const inputColumn = [state[offset], state[offset + 1], state[offset + 2], state[offset + 3]];
        const expectedColumn = mixColumnJS(inputColumn);
        const actualColumn = [expected[offset], expected[offset + 1], expected[offset + 2], expected[offset + 3]];

        expect(actualColumn).toEqual(expectedColumn);
      }
    });

    it("should verify state transformation properties", async function (): Promise<void> {
      // Test that column-major ordering is preserved
      const testState = [
        0x00, 0x01, 0x02, 0x03,  // Column 0: positions [0,1,2,3]
        0x10, 0x11, 0x12, 0x13,  // Column 1: positions [4,5,6,7]
        0x20, 0x21, 0x22, 0x23,  // Column 2: positions [8,9,10,11]
        0x30, 0x31, 0x32, 0x33   // Column 3: positions [12,13,14,15]
      ];

      const result = mixColumnsJS(testState);

      await circuit.expectPass(
        { in: testState },
        { out: result },
      );

      // Verify that the transformation maintains column structure
      // by checking that columns are processed independently
      for (let col = 0; col < 4; col++) {
        const offset = col * 4;
        const inputColumn = [
          testState[offset], testState[offset + 1],
          testState[offset + 2], testState[offset + 3]
        ];
        const expectedColumn = mixColumnJS(inputColumn);

        expect([result[offset], result[offset + 1], result[offset + 2], result[offset + 3]])
          .toEqual(expectedColumn);
      }
    });

    it("should handle edge cases for full state", async function (): Promise<void> {
      const edgeCases = [
        {
          name: "All maximum values",
          state: new Array(16).fill(0xff)
        },
        {
          name: "MSB set pattern",
          state: new Array(16).fill(0x80)
        },
        {
          name: "Alternating pattern across state",
          state: Array.from({ length: 16 }, (_, i) => i % 2 === 0 ? 0xaa : 0x55)
        },
        {
          name: "Sequential values",
          state: Array.from({ length: 16 }, (_, i) => i * 0x11)
        }
      ];

      for (const { name, state } of edgeCases) {
        const expected = mixColumnsJS(state);
        await circuit.expectPass(
          { in: state },
          { out: expected },
        );
      }
    });
  });
});