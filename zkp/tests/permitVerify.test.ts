import { WitnessTester, flattenEstates, flattenEcdsaSignature, splitBigInt } from "./util/index.js";
import { EcdsaSignature, Estate, Nonce, Timestamp } from "./type/index.js";

describe("VerifyPermit Circuit", { timeout: 1200_000 }, function () {
  let circuit: WitnessTester<["testator", "estates", "nonce", "deadline", "will", "signature"]>;

  describe("Verify Permit with 2 Estates", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify/permitVerify.circom",
        "VerifyPermit",
        {
          templateParams: ["2"],
        },
      );
      circuit.setConstraint("permit with 2 estates");
    }, 120_000);

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should pass the verification for valid permit", async function (): Promise<void> {
      const testCases = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n
            }
          ] as Estate[],
          salt: 12694447595861466419244258169335441343265382743954236586072546691080547501349n,
          will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
          nonce: 307798376644172688526653206965886192621n as Nonce,
          deadline: 1789652776 as Timestamp,
          signature: {
            r: splitBigInt(BigInt("0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8")),
            s: splitBigInt(BigInt("0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef")),
            v: 27
          } as EcdsaSignature
        }
      ]

      for (const { testator, estates, will, nonce, deadline, signature } of testCases) {
        await circuit.expectPass(
          {
            testator,
            estates: flattenEstates(estates),
            nonce,
            deadline,
            will,
            signature: flattenEcdsaSignature(signature)
          }
        );
      }
    });
  });
});
