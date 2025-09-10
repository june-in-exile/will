import { WitnessTester } from "./util/index.js";
import {
  Keccak256Utils,
  keccak256,
} from "./logic/index.js";
import { Bit } from "./type/index.js";

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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
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

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1360) as Bit[];
      const digest = keccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });
});
