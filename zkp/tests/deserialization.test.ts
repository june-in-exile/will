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
    ["testator", "executor", "estates", "salt", "will", "nonce", "deadline", "signature"]
  >;

  describe("Deserialize The Will", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/deserialization.circom",
        "Deserialize",
        {
          templateParams: ["293"],
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
            "041F57c4492760aaE44ECed29b49a30DaAD3D4CcF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40c5d2c214e0b80b2561c6d1de7cc6d4fe8e695b0cc5e14486c7874f60a84d6ac67f118dB12aC53D93a87efbaf18e08f4927599e1556fdf14ff8dea66a892c6c490e208f240000000124f17e66e8f8eb8a61fdf1aa50e8c7ba680b9b8ccaada8132cb13842a764dfd5e31a6b8737a5f3084f43936b9d528d1c86ad1d30352fa487a852882cbe5d7517505d9b6d1b",
          ) as Byte[],
          testator: BigInt(
            "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
          ) as Address,
          executor: BigInt(
            "0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a",
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
              "0xc5d2c214e0b80b2561c6d1de7cc6d4fe8e695b0cc5e14486c7874f60a84d6ac6",
            ),
          ) as Uint256,
          will: BigInt("0x7f118dB12aC53D93a87efbaf18e08f4927599e15") as Address,
          nonce: 115632153139472844984923911170979565348n as Nonce,
          deadline: 4914773606 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xe8f8eb8a61fdf1aa50e8c7ba680b9b8ccaada8132cb13842a764dfd5e31a6b87",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x37a5f3084f43936b9d528d1c86ad1d30352fa487a852882cbe5d7517505d9b6d",
              ),
            ),
            v: 27,
          } as EcdsaSignature,
        },
        {
          serializedBytes: hexToByte(
            "041F57c4492760aaE44ECed29b49a30DaAD3D4CcF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40f21d47ad929add694019770b112260bd736fed986e1cfe29f6f984a3cc90d2e9F107927FA4b537D81225e88508Bd527fe4fd6dBde2e81089218a36bc51143a9f0e27c8e80000000124f1803fce81d4529044eebc1907ecc1d55cf156788564754de79e8b118372bf7290774064402adbab102508d1d1989cc82fd80260c9a76a03dd3bddbf853d5964a55cc41c",
          ) as Byte[],
          testator: BigInt(
            "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
          ) as Address,
          executor: BigInt(
            "0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a",
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
              "0xf21d47ad929add694019770b112260bd736fed986e1cfe29f6f984a3cc90d2e9",
            ),
          ) as Uint256,
          will: BigInt("0xF107927FA4b537D81225e88508Bd527fe4fd6dBd") as Address,
          nonce: 301610475301763085735852030226961254632n as Nonce,
          deadline: 4914774079 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xce81d4529044eebc1907ecc1d55cf156788564754de79e8b118372bf72907740",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x64402adbab102508d1d1989cc82fd80260c9a76a03dd3bddbf853d5964a55cc4",
              ),
            ),
            v: 28,
          } as EcdsaSignature,
        },
      ];

      for (const {
        serializedBytes,
        testator,
        executor,
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
            executor,
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
        "041F57c4492760aaE44ECed29b49a30DaAD3D4CcF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40c5d2c214e0b80b2561c6d1de7cc6d4fe8e695b0cc5e14486c7874f60a84d6ac67f118dB12aC53D93a87efbaf18e08f4927599e1556fdf14ff8dea66a892c6c490e208f240000000124f17e66e8f8eb8a61fdf1aa50e8c7ba680b9b8ccaada8132cb13842a764dfd5e31a6b8737a5f3084f43936b9d528d1c86ad1d30352fa487a852882cbe5d7517505d9b6d1b",
      );

      const serializedBytesLack1Byte = validSerializedBytes.slice(1); // lacks 1 byte
      const serializedBytesExceed1Byte = validSerializedBytes.push(1); // exceeds 1 byte

      await circuit.expectFail({ serializedBytes: serializedBytesLack1Byte });
      await circuit.expectFail({ serializedBytes: serializedBytesExceed1Byte });
    });
  });
});
