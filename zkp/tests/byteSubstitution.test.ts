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

    it("should substitute random words according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const bytes = Array.from(AESUtils.randomBytes(4));
        // TODO: Update this code snippet after the JSON format is fixed.
        // const _in: Word = { bytes: [bytes[0], bytes[1], bytes[2], bytes[3]] };
        const word: [number, number, number, number] = [
          bytes[0],
          bytes[1],
          bytes[2],
          bytes[3],
        ];

        await circuit.expectPass({ in: word }, { out: subWord(word) });
      }
    });
  });
});

describe("SubBytes Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Bytes Substitution in Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/byteSubstitution.circom",
        "SubBytes",
      );
      console.info(
        "SubBytes circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute random 4x4 bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const bytes = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass(
          { in: bytes },
          { out: substituteBytes(bytes) },
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

    it("should substitute all bytes according to AES specification", async function (): Promise<void> {
      for (let byte = 0x00; byte <= 0xff; byte++) {
        const bytes = Array.from(Buffer.from([byte]));

        await circuit.expectPass(
          { in: bytes },
          { out: substituteBytes(bytes) },
        );
      }
    });
  });

  describe("4-Byte Bytes Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/byteSubstitution.circom",
        "SubstituteBytes",
        {
          templateParams: ["4"],
        },
      );
      console.info(
        "4-byte SubstitutionBytes circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute random bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const bytes = Array.from(AESUtils.randomBytes(4));

        await circuit.expectPass(
          { in: bytes },
          { out: substituteBytes(bytes) },
        );
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

    it("should substitute random bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const bytes = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass(
          { in: bytes },
          { out: substituteBytes(bytes) },
        );
      }
    });
  });
});
