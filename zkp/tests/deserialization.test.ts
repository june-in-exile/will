import { Byte, Address, Estate, Nonce, Timestamp, Signature } from "./type/index.js";
import { WitnessTester, hexToByte } from "./util/index.js";

describe("Deserialize Circuits", function () {
  let circuit: WitnessTester<
    ["serializedBytes"],
    ["testator", "estates", "will", "nonce", "deadline", "signature"]
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

    it("should return the correct terms in the will", async function (): Promise<void> {
      const serializedBytes: Byte[] = hexToByte(
        "041F57c4492760aaE44ECed29b49a30DaAD3D4Cc3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40b1f48bd14750374db91306c88bc537b49fd7e3d9b8a79a1a2283e6db18f1ab7cf34F996Ba6FcBa4286aBCC4b1B39e5F4378233584f9540afb18a930371a6be8b044aa36b6a9686188795d3e26d5166091b9b25a260022e46311ae45cc9d1cc744b787a6e406fecd13f4a6eb5d3ae1a3c2a60590ed36b7a0220b84af1436f435d798b21e0ec4891871c",
      );
      const testator: Address = BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc");
      const estates: Estate[] = [
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
      ];
      const will: Address = BigInt("0xf34F996Ba6FcBa4286aBCC4b1B39e5F437823358");
      const nonce: Nonce = 105783975893019489732105565735546954603n;
      const deadline: Timestamp = 1788249624;
      const signature = hexToByte(
        "0x8795d3e26d5166091b9b25a260022e46311ae45cc9d1cc744b787a6e406fecd13f4a6eb5d3ae1a3c2a60590ed36b7a0220b84af1436f435d798b21e0ec4891871c",
      ) as Signature;

      await circuit.expectPass(
        { serializedBytes },
        {
          testator,
          estates,
          will,
          nonce,
          deadline,
          signature,
        },
      );
    });
  });
});
