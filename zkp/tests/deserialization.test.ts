import { WitnessTester, hexToByte } from "./util/index.js";

describe("Deserialize Circuits", function () {
  let circuit: WitnessTester<
    ["serialized"],
    ["testator", "estates", "will", "nonce", "deadline", "signature"]
  >;

  describe("Deserialize The Will", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/deserialization.circom",
        "Deserialize",
        {
          templateParams: ["100"],
        },
      );
      circuit.setConstraint("will deserialization");
    });

    it("should return the correct terms in the will", async function (): Promise<void> {
      const serialized = hexToByte(
        "041F57c4492760aaE44ECed29b49a30DaAD3D4Cc2:3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d3e8:3fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E4c4b40:17befc98247f9d:8436b0792C2A7a8ECC007a4BaD29Cc67cf70f26934e03c403198b:6a8e4087:fa12e4495c42fe7d2342088355588888289689c7f32df8c32fceba20de587938764e43d5e9e89e1d2229207ce2c17377ebf581fb587bda165e7b31e748b94fba1c",
      );
      const testator = hexToByte("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc");
      const estates = [
        {
          beneficiary: hexToByte("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
          token: hexToByte("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
          amount: 1000,
        },
        {
          beneficiary: hexToByte("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
          token: hexToByte("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
          amount: 5000000,
        },
      ];
      const will = hexToByte("0x5C0457d593A6ABA3220318f009838C9BDc29cA71");
      const nonce = 950471206401626;
      const deadline = 1787826829;
      const signature = hexToByte(
        "0xad49ccaae4bf2ed71a1f040ab7071f7436769267d88885c09dc8ccf30f948ed6256715bf4788080a14840906291673940879deaf5e6bed031bb9f96f71a69d041b",
      );

      await circuit.expectPass(
        { serialized },
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
