import { AESSbox, AESUtils } from "./helpers";
import { WitnessTester } from "./utils";

describe("SubWord Circuit", function () {
  let circuit: WitnessTester<["_in"], ["_out"]>;

  describe("Word Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/substituteBytes.circom",
        "SubWord",
      );
      console.info(
        "SubWord circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute random words according to SBOX", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = AESUtils.randomBytes(4),
          _out = AESSbox.substituteBytes(_in);

        await circuit.expectPass(
          { _in: Array.from(_in) },
          { _out: Array.from(_out) },
        );
      }
    });
  });
});

describe("SubstituteBytes Circuit", function () {
  let circuit: WitnessTester<["_in"], ["_out"]>;

  describe("Byte Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/substituteBytes.circom",
        "SubstituteBytes",
        {
          templateParams: ["1"],
        },
      );
      console.info(
        "1-Byte SubstitutionBytes circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute random byte according to SBOX", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = AESUtils.randomBytes(1),
          _out = AESSbox.substituteBytes(_in);

        await circuit.expectPass(
          { _in: Array.from(_in) },
          { _out: Array.from(_out) },
        );
      }
    });
  });

  describe("16-Byte Bytes Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/substituteBytes.circom",
        "SubstituteBytes",
        {
          templateParams: ["16"],
        },
      );
      console.info(
        "16-Byte SubstitutionBytes circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute random bytes according to SBOX", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = AESUtils.randomBytes(16),
          _out = AESSbox.substituteBytes(_in);

        await circuit.expectPass(
          { _in: Array.from(_in) },
          { _out: Array.from(_out) },
        );
      }
    });
  });

  describe("256-Byte Bytes Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/substituteBytes.circom",
        "SubstituteBytes",
        {
          templateParams: ["256"],
        },
      );
      console.info(
        "256-Byte SubstitutionBytes circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should substitute all bytes in SBOX correctly", async function (): Promise<void> {
      const _in = new Array(0),
        _out = new Array(0);
      for (let byte = 0x00; byte <= 0xff; byte++) {
        _in.push(byte);
        _out.push(AESSbox.SBOX[byte]);
      }
      await circuit.expectPass({ _in }, { _out });
    });
  });
});
