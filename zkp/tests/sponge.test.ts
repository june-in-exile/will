import { WitnessTester } from "./util/index.js";
import { Keccak256, Keccak256Utils, absorb, squeeze } from "./logic/index.js";
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it(
      "should absorb two blocks and calculate the correct final state",
      { timeout: 30_000 },
      async function (): Promise<void> {
        const msg = Keccak256Utils.getRandomBits(2176) as Bit[];
        const finalStateArray = absorb(msg);

        await circuit.expectPass({ msg }, { finalStateArray });
      },
    );
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should squeeze the correct hash out of two blocks", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(200));
      const stateArray = Keccak256Utils.bytesToStateArray(randomBytes);
      const digest = squeeze(stateArray);

      await circuit.expectPass({ stateArray }, { digest });
    });
  });
});
