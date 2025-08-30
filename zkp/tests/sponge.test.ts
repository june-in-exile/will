import { WitnessTester } from "./util/index.js";
import { Keccak256Utils } from "./logic/index.js";
import { Byte200 } from "./type/byte.js";

describe("BytesToStateArray Circuit", function () {
  let circuit: WitnessTester<["bytes"], ["stateArray"]>;

  describe("Convert Bytes to State Array", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "BytesToStateArray",
      );
      circuit.setConstraint("bytes to state array");
    });

    it("should convert 200 bytes to 5x5x64 bits", async function (): Promise<void> {
      // NIST Examples with Intermediate Values
      const bytes = [
        ...Array(136).fill(0xa3),
        ...Array(64).fill(0x00),
      ] as Byte200;

      const stateArray = Keccak256Utils.bytesToStateArray(
        Uint8Array.from(bytes),
      );
      await circuit.expectPass({ bytes }, { stateArray });
    });
  });
});

describe("StateArrayToBytes Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["bytes"]>;

  describe("Convert State Array to Bytes", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "StateArrayToBytes",
      );
      circuit.setConstraint("state array to bytes");
    });

    it("should convert 5x5x64 bits to 200 bytes", async function (): Promise<void> {
      // NIST Examples with Intermediate Values
      const lane_a3 = [
        1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1,
        1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1,
        1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1,
      ];
      const lane_00 = Array(64).fill(0);

      const stateArray = [
        [lane_a3, lane_a3, lane_a3, lane_a3, lane_00],
        [lane_a3, lane_a3, lane_a3, lane_a3, lane_00],
        [lane_a3, lane_a3, lane_a3, lane_00, lane_00],
        [lane_a3, lane_a3, lane_a3, lane_00, lane_00],
        [lane_a3, lane_a3, lane_a3, lane_00, lane_00],
      ];

      const bytes = Array.from(
        Keccak256Utils.stateArrayToBytes(stateArray),
      ) as Byte200;
      await circuit.expectPass({ stateArray }, { bytes });
    });
  });
});
