import { WitnessTester } from "./util/index.js";
import { Keccak256Utils, vocdoniKeccak256 } from "./logic/index.js";
import { Bit } from "./type/index.js";

describe("VocdoniKeccak256 Circuit", function () {
  let circuit: WitnessTester<["msg"], ["digest"]>;

  /*
   * @note 1 block is 1088 bits / 8 = 136 bytes
   */
  describe("Hash 1 bit", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/vocdoniKeccak256.circom",
        "VocdoniKeccak256",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("1-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1) as Bit[];
      const digest = vocdoniKeccak256(msg);
      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 256 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/vocdoniKeccak256.circom",
        "VocdoniKeccak256",
        {
          templateParams: ["256"],
        },
      );
      circuit.setConstraint("256-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(256) as Bit[];
      const digest = vocdoniKeccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 512 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/vocdoniKeccak256.circom",
        "VocdoniKeccak256",
        {
          templateParams: ["512"],
        },
      );
      circuit.setConstraint("512-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(512) as Bit[];
      const digest = vocdoniKeccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });

  describe("Hash 1080 bits", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/vocdoniKeccak256.circom",
        "VocdoniKeccak256",
        {
          templateParams: ["1080"],
        },
      );
      circuit.setConstraint("1080-bit massage");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const msg = Keccak256Utils.getRandomBits(1080) as Bit[];
      const digest = vocdoniKeccak256(msg);

      await circuit.expectPass({ msg }, { digest });
    });
  });
});
