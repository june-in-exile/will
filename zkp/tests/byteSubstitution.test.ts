import { Byte, Byte4, Byte16 } from "./type/index.js";
import { WitnessTester } from "./util/index.js";
import { AESUtils, subWord, subBytes, substituteBytes } from "./logic/index.js";

describe("SubWord Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Word Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/byteSubstitution.circom",
        "SubWord",
      );
      circuit.setConstraint("word substitution");
    });

    it("should substitute random words according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(4));

        await circuit.expectPass(
          { in: _in },
          { out: subWord({ bytes: _in as Byte4 }) },
        );
      }
    });
  });
});

describe("SubBytes Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Bytes Substitution in Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/byteSubstitution.circom",
        "SubBytes",
      );
      circuit.setConstraint("16-byte substitution");
    });

    it("should substitute random 4x4 bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass({ in: _in }, { out: subBytes(_in as Byte16) });
      }
    });
  });
});

describe("SubstituteBytes Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Single Byte Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/byteSubstitution.circom",
        "SubstituteBytes",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("1-byte bytes substitution");
    });

    it("should substitute all bytes according to AES specification", async function (): Promise<void> {
      for (let byte = 0x00; byte <= 0xff; byte++) {
        const _in = Array.from(Buffer.from([byte]));

        await circuit.expectPass(
          { in: _in },
          { out: substituteBytes(_in as Byte[]) },
        );
      }
    });
  });

  describe("4-Byte Bytes Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/byteSubstitution.circom",
        "SubstituteBytes",
        {
          templateParams: ["4"],
        },
      );
      circuit.setConstraint("4-byte bytes substitution");
    });

    it("should substitute random bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(4));

        await circuit.expectPass(
          { in: _in },
          { out: substituteBytes(_in as Byte[]) },
        );
      }
    });
  });

  describe("16-Byte Bytes Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/byteSubstitution.circom",
        "SubstituteBytes",
        {
          templateParams: ["16"],
        },
      );
      circuit.setConstraint("16-byte bytes substitution");
    });

    it("should substitute random bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass(
          { in: _in },
          { out: substituteBytes(_in as Byte[]) },
        );
      }
    });
  });
});
