import { WitnessTester } from "./util/index.js";
import { Keccak256, Keccak256Utils } from "./logic/index.js";
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

describe("Padding Circuit", function () {
  let circuit: WitnessTester<["msg"], ["paddedMsg"]>;

  describe("Padding for Empty Message", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Padding",
        {
          templateParams: ["0", "1088"],
        }
      );
      circuit.setConstraint("0-bit message, 1088-bit rate (1088-bit padding)");
    });

    it("should add 1 whole block of padding", async function (): Promise<void> {
      const msg: number[] = [];
      const paddedMsg = Keccak256.addPaddingBits(msg);

      await circuit.expectPass({ msg }, { paddedMsg });
    });
  });

  describe("Padding for 1-Block Message", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Padding",
        {
          templateParams: ["1088", "1088"],
        }
      );
      circuit.setConstraint("1088-bit message, 1088-bit rate (1088-bit padding)");
    });

    it("should add 1 whole block of padding", async function (): Promise<void> {
      const randomBytes = Keccak256Utils.randomBytes(136);
      const msg = Keccak256Utils.bytesToBits(randomBytes);
      const paddedMsg = Keccak256.addPaddingBits(msg);

      await circuit.expectPass({ msg }, { paddedMsg });
    });
  });

  describe("Padding for 1-Block Minus 1-Bit Message", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Padding",
        {
          templateParams: ["1087", "1088"],
        }
      );
      circuit.setConstraint("1087-bit message, 1088-bit rate (1089-bit padding)");
    });

    it("should add 1 block plus 1 bit of padding", async function (): Promise<void> {
      const randomBytes = Keccak256Utils.randomBytes(136);
      const randomBits = Keccak256Utils.bytesToBits(randomBytes);
      const msg = randomBits.slice(0, 1087);
      const paddedMsg = Keccak256.addPaddingBits(msg);

      await circuit.expectPass({ msg }, { paddedMsg });
    });
  });

  describe("Padding for 1-Block Minus 2-Bit Message", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Padding",
        {
          templateParams: ["1086", "1088"],
        }
      );
      circuit.setConstraint("1086-bit message, 1088-bit rate (2-bit padding)");
    });

    it("should add 2 bits of padding", async function (): Promise<void> {
      const randomBytes = Keccak256Utils.randomBytes(136);
      const randomBits = Keccak256Utils.bytesToBits(randomBytes);
      const msg = randomBits.slice(0, 1086);
      const paddedMsg = Keccak256.addPaddingBits(msg);

      await circuit.expectPass({ msg }, { paddedMsg });
    });
  });

  describe("Padding for Message of Half Block", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Padding",
        {
          templateParams: ["544", "1088"],
        }
      );
      circuit.setConstraint("544-bit message, 1088-bit rate (544-bit padding)");
    });

    it("should pad to 1 block", async function (): Promise<void> {
      const randomBytes = Keccak256Utils.randomBytes(68);
      const msg = Keccak256Utils.bytesToBits(randomBytes);
      const paddedMsg = Keccak256.addPaddingBits(msg);

      await circuit.expectPass({ msg }, { paddedMsg });
    });
  });
});

describe("Absorb Circuit", function () {
  let circuit: WitnessTester<["msg"], ["finalStateArray"]>;

  it("should reject unpadded message", async function (): Promise<void> {
    const invalidMsgBits = ["0", "1", "1087", "1089"];
    for (const invalidMsgBit of invalidMsgBits) { 
      await expect(
        WitnessTester.construct(
          "circuits/shared/components/keccak256/sponge.circom",
          "Absorb",
          {
            templateParams: [invalidMsgBit, "1088"],
          }
        ),
      ).rejects.toThrow();
    }
  });

  describe("Absorb Message of Rate Size", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Absorb",
        {
          templateParams: ["1088", "1088"],
        }
      );
      circuit.setConstraint("1088-bit message, 1088-bit rate");
    });

    it("should absorb the message the calculate the correct final state", async function (): Promise<void> {
      const randomBytes = Keccak256Utils.randomBytes(136);
      const msg = Keccak256Utils.bytesToBits(randomBytes);
      const finalLanes = Keccak256.absorb(randomBytes);
      const finalStateArray = Keccak256Utils.lanesToStateArray(finalLanes);

      await circuit.expectPass({ msg }, { finalStateArray });
    });
  });

  describe("Absorb Message of Double Rate Size", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Absorb",
        {
          templateParams: ["2176", "1088"],
        }
      );
      circuit.setConstraint("1088-bit message, 1088-bit rate");
    });

    it("should absorb the message the calculate the correct final state", async function (): Promise<void> {
      const randomBytes = Keccak256Utils.randomBytes(272);
      const msg = Keccak256Utils.bytesToBits(randomBytes);
      const finalLanes = Keccak256.absorb(randomBytes);
      const finalStateArray = Keccak256Utils.lanesToStateArray(finalLanes);

      await circuit.expectPass({ msg }, { finalStateArray });
    });
  });
});
