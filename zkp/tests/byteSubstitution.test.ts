import { AESUtils, subWord, substituteBytes } from "./helpers";
import { WitnessTester } from "./utils";

describe("SubWord Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Word Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/byteSubstitution.circom",
        "SubWord",
      );
      console.info(
        "SubWord circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute random words according to SBOX", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const bytes = Array.from(AESUtils.randomBytes(4));
        // TODO: Update this code snippet after the JSON format is fixed.
        // const _in: Word = { bytes: [bytes[0], bytes[1], bytes[2], bytes[3]] };
        const _in: [number, number, number, number] = [bytes[0], bytes[1], bytes[2], bytes[3]];

        await circuit.expectPass(
          { in: _in },
          { out: subWord(_in) },
        );
      }
    });
  });
});

describe("SubstituteBytes Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Single Byte Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/byteSubstitution.circom",
        "SubstituteBytes",
        {
          templateParams: ["1"],
        },
      );
      console.info(
        "1-byte SubstitutionBytes circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute all bytes according to SBOX", async function (): Promise<void> {
      for (let byte = 0x00; byte <= 0xff; byte++) {
        const _in = Array.from(Buffer.from([byte]));

        await circuit.expectPass({ in: _in }, { out: substituteBytes(_in) });
      }
    });
  });

  describe("16-Byte Bytes Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/byteSubstitution.circom",
        "SubstituteBytes",
        {
          templateParams: ["16"],
        },
      );
      console.info(
        "16-byte SubstitutionBytes circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute random bytes according to SBOX", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass({ in: _in }, { out: substituteBytes(_in) });
      }
    });
  });
});
