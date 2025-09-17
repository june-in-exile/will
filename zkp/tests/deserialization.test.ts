import {
  Byte,
  Address,
  Estate,
  Nonce,
  Timestamp,
  EcdsaSignature,
  Uint256,
} from "./type/index.js";
import { WitnessTester, hexToByte, splitBigInt } from "./util/index.js";

describe("Deserialize Circuits", function () {
  let circuit: WitnessTester<
    ["serializedBytes"],
    ["testator", "estates", "salt", "will", "nonce", "deadline", "signature"]
  >;

  describe("Deserialize The Will", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/deserialization.circom",
        "Deserialize",
        {
          templateParams: ["269"],
        },
      );
      circuit.setConstraint("will deserialization");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should deserialize the will from real case", async function (): Promise<void> {
      const testCases = [
        {
          serializedBytes: hexToByte(
            "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40709090f298f23a5c179aee70b7f4ad6ec3784f273e414889c99c4d1f7710d8f51555c060bdD2ac0D37F1460f6B556b05BEc6149767081bdc013ef6355b4ce401235f874d6a9e7b0f6a530998e973a4c19078304df656de49a06ecc74988b94410ec605295db015dd2823d3fe682f8f1b6437c982d46cba08d1761a9721303da16185fcef17123e751b",
          ) as Byte[],
          testator: BigInt(
            "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
          ) as Address,
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n,
            },
          ] as Estate[],
          salt: splitBigInt(
            BigInt(
              "0x709090f298f23a5c179aee70b7f4ad6ec3784f273e414889c99c4d1f7710d8f5",
            ),
          ) as Uint256,
          will: BigInt("0x1555c060bdD2ac0D37F1460f6B556b05BEc61497") as Address,
          nonce: 136952586996355266360424646101069432653n as Nonce,
          deadline: 1788771087 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0x6a530998e973a4c19078304df656de49a06ecc74988b94410ec605295db015dd",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x2823d3fe682f8f1b6437c982d46cba08d1761a9721303da16185fcef17123e75",
              ),
            ),
            v: 27,
          } as EcdsaSignature,
        },
        {
          serializedBytes: hexToByte(
            "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40b1f48bd14750374db91306c88bc537b49fd7e3d9b8a79a1a2283e6db18f1ab7cf34F996Ba6FcBa4286aBCC4b1B39e5F4378233584f9540afb18a930371a6be8b044aa36b6a9686188795d3e26d5166091b9b25a260022e46311ae45cc9d1cc744b787a6e406fecd13f4a6eb5d3ae1a3c2a60590ed36b7a0220b84af1436f435d798b21e0ec4891871c",
          ) as Byte[],
          testator: BigInt(
            "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
          ) as Address,
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n,
            },
          ] as Estate[],
          salt: splitBigInt(
            BigInt(
              "0xb1f48bd14750374db91306c88bc537b49fd7e3d9b8a79a1a2283e6db18f1ab7c",
            ),
          ) as Uint256,
          will: BigInt("0xf34F996Ba6FcBa4286aBCC4b1B39e5F437823358") as Address,
          nonce: 105783975893019489732105565735546954603n as Nonce,
          deadline: 1788249624 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0x8795d3e26d5166091b9b25a260022e46311ae45cc9d1cc744b787a6e406fecd1",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x3f4a6eb5d3ae1a3c2a60590ed36b7a0220b84af1436f435d798b21e0ec489187",
              ),
            ),
            v: 28,
          } as EcdsaSignature,
        },
      ];

      for (const {
        serializedBytes,
        testator,
        estates,
        salt,
        will,
        nonce,
        deadline,
        signature,
      } of testCases) {
        await circuit.expectPass(
          { serializedBytes },
          {
            testator,
            estates,
            salt,
            will,
            nonce,
            deadline,
            signature,
          },
        );
      }
    });

    it("should reject the serialized bytes of invalid length", async function (): Promise<void> {
      const validSerializedBytes: Byte[] = hexToByte(
        "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40709090f298f23a5c179aee70b7f4ad6ec3784f273e414889c99c4d1f7710d8f51555c060bdD2ac0D37F1460f6B556b05BEc6149767081bdc013ef6355b4ce401235f874d6a9e7b0f6a530998e973a4c19078304df656de49a06ecc74988b94410ec605295db015dd2823d3fe682f8f1b6437c982d46cba08d1761a9721303da16185fcef17123e751b",
      );

      const serializedBytesLack1Byte = validSerializedBytes.slice(1); // lacks 1 byte
      const serializedBytesExceed1Byte = validSerializedBytes.push(1); // exceeds 1 byte

      await circuit.expectFail({ serializedBytes: serializedBytesLack1Byte });
      await circuit.expectFail({ serializedBytes: serializedBytesExceed1Byte });
    });
  });
});
