import { WitnessTester } from "./util/index.js";
import {
  Keccak256,
  Keccak256Utils,
  absorb,
  squeeze,
  keccak256,
} from "./logic/index.js";
import { Bit } from "./type/index.js";

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
      const msg = Keccak256Utils.getRandomBits(1088);
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
      const msg = Keccak256Utils.getRandomBits(1087);
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
      const msg = Keccak256Utils.getRandomBits(1086);
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
      const msg = Keccak256Utils.getRandomBits(544);
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
      const msg = Keccak256Utils.getRandomBits(1088) as Bit[];
      const finalStateArray = absorb(msg);

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
      const msg = Keccak256Utils.getRandomBits(2176) as Bit[];
      const finalStateArray = absorb(msg);

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
      const stateArray = Keccak256Utils.bytesToStateArray(randomBytes);
      const digest = squeeze(stateArray);

      await circuit.expectPass({ stateArray }, { digest });
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
      const stateArray = Keccak256Utils.bytesToStateArray(randomBytes);
      const digest = squeeze(stateArray);

      await circuit.expectPass({ stateArray }, { digest });
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
      const stateArray = Keccak256Utils.bytesToStateArray(randomBytes);
      const digest = squeeze(stateArray);

      await circuit.expectPass({ stateArray }, { digest });
    });
  });
});

describe("Keccak256 Circuit", function () {
  let circuit: WitnessTester<["msg"], ["digest"]>;

  /*
   * @note 1 block is 1088 bits / 8 = 136 bytes
   */
  describe("Hash 1 bit", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Keccak256",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("1-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 256 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Keccak256",
        {
          templateParams: ["256"],
        },
      );
      circuit.setConstraint("256-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(256) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 512 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Keccak256",
        {
          templateParams: ["512"],
        },
      );
      circuit.setConstraint("512-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(512) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 1080 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Keccak256",
        {
          templateParams: ["1080"],
        },
      );
      circuit.setConstraint("1080-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1080) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 1086 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Keccak256",
        {
          templateParams: ["1086"],
        },
      );
      circuit.setConstraint("1086-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1086) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 1087 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Keccak256",
        {
          templateParams: ["1087"],
        },
      );
      circuit.setConstraint("1087-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1087) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 1088 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Keccak256",
        {
          templateParams: ["1088"],
        },
      );
      circuit.setConstraint("1088-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1088) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 1360 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/sponge.circom",
        "Keccak256",
        {
          templateParams: ["1360"],
        },
      );
      circuit.setConstraint("1360-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1360) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });
});
