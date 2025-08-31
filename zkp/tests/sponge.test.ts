import { WitnessTester } from "./util/index.js";
import { Keccak256, Keccak256Utils } from "./logic/index.js";

describe("Padding Circuit", function () {
  let circuit: WitnessTester<["msg"], ["paddedMsg"]>;

  describe("Padding for Empty Message", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Padding",
        {
          templateParams: ["0", "1088"],
        },
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
        },
      );
      circuit.setConstraint(
        "1088-bit message, 1088-bit rate (1088-bit padding)",
      );
    });

    it("should add 1 whole block of padding", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(136));
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
        },
      );
      circuit.setConstraint(
        "1087-bit message, 1088-bit rate (1089-bit padding)",
      );
    });

    it("should add 1 block plus 1 bit of padding", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(136));
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
        },
      );
      circuit.setConstraint("1086-bit message, 1088-bit rate (2-bit padding)");
    });

    it("should add 2 bits of padding", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(136));
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
        },
      );
      circuit.setConstraint("544-bit message, 1088-bit rate (544-bit padding)");
    });

    it("should pad to 1 block", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(68));
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
          },
        ),
      ).rejects.toThrow();
    }
  });

  describe("Absorb One Block", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Absorb",
        {
          templateParams: ["1088", "1088"],
        },
      );
      circuit.setConstraint("1088-bit message, 1088-bit rate");
    });

    it("should absorb one block and calculate the correct final state", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(136));
      const msg = Keccak256Utils.bytesToBits(randomBytes);
      const finalLanes = Keccak256.absorb(randomBytes);
      const finalStateArray = Keccak256Utils.lanesToStateArray(finalLanes);

      await circuit.expectPass({ msg }, { finalStateArray });
    });
  });

  describe("Absorb Two Blocks", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Absorb",
        {
          templateParams: ["2176", "1088"],
        },
      );
      circuit.setConstraint("2176-bit message, 1088-bit rate");
    });

    it("should absorb two blocks and calculate the correct final state", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(272));
      const msg = Keccak256Utils.bytesToBits(randomBytes);
      const finalLanes = Keccak256.absorb(randomBytes);
      const finalStateArray = Keccak256Utils.lanesToStateArray(finalLanes);

      await circuit.expectPass({ msg }, { finalStateArray });
    });
  });
});

describe("Squeeze Circuit", function () {
  let circuit: WitnessTester<["stateArray"], ["digest"]>;

  describe("Squeeze Less Than One Block", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Squeeze",
        {
          templateParams: ["256", "1088"],
        },
      );
      circuit.setConstraint("256-bit digest, 1088-bit rate");
    });

    it("should squeeze the correct hash out of one block", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(200));
      const lanes = Keccak256Utils.bytesToLanes(randomBytes);
      const digest = Keccak256.squeeze(lanes, 32);

      await circuit.expectPass(
        { stateArray: Keccak256Utils.lanesToStateArray(lanes) },
        { digest: Keccak256Utils.bytesToBits(digest) },
      );
    });
  });

  describe("Squeeze Exactly One Block", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Squeeze",
        {
          templateParams: ["1088", "1088"],
        },
      );
      circuit.setConstraint("1088-bit digest, 1088-bit rate");
    });

    it("should squeeze the correct hash out of one block", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(200));
      const lanes = Keccak256Utils.bytesToLanes(randomBytes);
      const digest = Keccak256.squeeze(lanes, 136);

      await circuit.expectPass(
        { stateArray: Keccak256Utils.lanesToStateArray(lanes) },
        { digest: Keccak256Utils.bytesToBits(digest) },
      );
    });
  });

  describe("Squeeze More Than One Block", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Squeeze",
        {
          templateParams: ["1360", "1088"],
        },
      );
      circuit.setConstraint("1360-bit digest, 1088-bit rate");
    });

    it("should squeeze the correct hash out of two blocks", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(200));
      const lanes = Keccak256Utils.bytesToLanes(randomBytes);
      const digest = Keccak256.squeeze(lanes, 170);

      await circuit.expectPass(
        { stateArray: Keccak256Utils.lanesToStateArray(lanes) },
        { digest: Keccak256Utils.bytesToBits(digest) },
      );
    });
  });
});
