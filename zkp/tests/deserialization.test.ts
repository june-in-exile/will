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
          templateParams: ["273"],
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
            "041F57c4492760aaE44ECed29b49a30DaAD3D4Cc3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40da59efefbc349fb23fd469d73af8716e7227f46d8344c723778c30e50300dbbc4b15DBB82edfE204B919b954d203aDA3B9fd4b6C6c7aeee77bb72f1584e64b0c0853bea80000000124f00249ca22900e456b5d491d395a5a33f0b21c1ceb50725431055e6b79275cf0cd82f423fd47592e237ba9bfa69f8462601f315d340d6d445f230d10209ef7f35483fd1b",
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
              "0xda59efefbc349fb23fd469d73af8716e7227f46d8344c723778c30e50300dbbc",
            ),
          ) as Uint256,
          will: BigInt("0x4b15DBB82edfE204B919b954d203aDA3B9fd4b6C") as Address,
          nonce: 144194929314991485118112431802946928296n as Nonce,
          deadline: 4914676297 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xca22900e456b5d491d395a5a33f0b21c1ceb50725431055e6b79275cf0cd82f4",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x23fd47592e237ba9bfa69f8462601f315d340d6d445f230d10209ef7f35483fd",
              ),
            ),
            v: 27,
          } as EcdsaSignature,
        },
        {
          serializedBytes: hexToByte(
            "041F57c4492760aaE44ECed29b49a30DaAD3D4Cc3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b403cd13c1652fcdbb66cf8d893375e7bac9b9874288bfa1380830bbf634fdb5b843D62e5d3CF0010229bDD13cc47ADF43485d12e9B48a1df3bf2a06aa520251a75085781740000000124f0033fbe0bf30e20e9ae0f6cbf9a0bcb688eb9bb26f206ecf82c0dbb4fb239ffdd5af374049f630a2d035429cfb5722c805e7308839e8dfbb1e8675f8a41e85f232a5d1c",
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
              "0x3cd13c1652fcdbb66cf8d893375e7bac9b9874288bfa1380830bbf634fdb5b84",
            ),
          ) as Uint256,
          will: BigInt("0x3D62e5d3CF0010229bDD13cc47ADF43485d12e9B") as Address,
          nonce: 96544903217630556886148066822443204980n as Nonce,
          deadline: 4914676543 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xbe0bf30e20e9ae0f6cbf9a0bcb688eb9bb26f206ecf82c0dbb4fb239ffdd5af3",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x74049f630a2d035429cfb5722c805e7308839e8dfbb1e8675f8a41e85f232a5d",
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
        "041F57c4492760aaE44ECed29b49a30DaAD3D4Cc3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b403cd13c1652fcdbb66cf8d893375e7bac9b9874288bfa1380830bbf634fdb5b843D62e5d3CF0010229bDD13cc47ADF43485d12e9B48a1df3bf2a06aa520251a75085781740000000124f0033fbe0bf30e20e9ae0f6cbf9a0bcb688eb9bb26f206ecf82c0dbb4fb239ffdd5af374049f630a2d035429cfb5722c805e7308839e8dfbb1e8675f8a41e85f232a5d1c",
      );

      const serializedBytesLack1Byte = validSerializedBytes.slice(1); // lacks 1 byte
      const serializedBytesExceed1Byte = validSerializedBytes.push(1); // exceeds 1 byte

      await circuit.expectFail({ serializedBytes: serializedBytesLack1Byte });
      await circuit.expectFail({ serializedBytes: serializedBytesExceed1Byte });
    });
  });
});
