import { WitnessTester, flattenEstates, flattenEcdsaSignature, splitBigInt } from "./util/index.js";
import { EcdsaSignature, Estate, Nonce, Timestamp } from "./type/index.js";

describe("Verify Permit with 1 Estate", function (): void {
  it("print inputs", async function (): Promise<void> {
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

    for (const testCase of testCases) {
      console.debug(testCase);
    }
  });
});

describe("VerifyPermit Circuit", { timeout: 900_000 }, function () {
  let circuit: WitnessTester<["testator", "estates", "nonce", "deadline", "will", "signature"]>;

  describe.only("Verify Permit with 1 Estate", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify/permitVerify.circom",
        "VerifyPermit",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("permit with 1 estate");
    }, 1200_000);

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should accept the verification for valid permit", async function (): Promise<void> {
      const testCases = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n
            }
          ] as Estate[],
          salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(BigInt("0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e")),
            s: splitBigInt(BigInt("0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c")),
            v: 28
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

    it("should reject the verification for invalid permit", async function (): Promise<void> {
      const testCases = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc") - 1n, // invalid testator
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n
            }
          ] as Estate[],
          salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(BigInt("0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e")),
            s: splitBigInt(BigInt("0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c")),
            v: 28
          } as EcdsaSignature
        },
        // {
        //   testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
        //   estates: [
        //     {
        //       beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
        //       token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
        //       amount: 1000n
        //     }
        //   ] as Estate[],
        //   salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
        //   will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
        //   nonce: 244376007658491587519721798548739170223n as Nonce,
        //   deadline: 1789798304 - 1 as Timestamp, // invalid deadline
        //   signature: {
        //     r: splitBigInt(BigInt("0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e")),
        //     s: splitBigInt(BigInt("0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c")),
        //     v: 28
        //   } as EcdsaSignature
        // },
        // {
        //   testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
        //   estates: [
        //     {
        //       beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c") + 1n, // invalid token
        //       token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
        //       amount: 1000n
        //     }
        //   ] as Estate[],
        //   salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
        //   will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
        //   nonce: 244376007658491587519721798548739170223n as Nonce,
        //   deadline: 1789798304 as Timestamp,
        //   signature: {
        //     r: splitBigInt(BigInt("0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e")),
        //     s: splitBigInt(BigInt("0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c")),
        //     v: 28
        //   } as EcdsaSignature
        // },
        // {
        //   testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
        //   estates: [
        //     {
        //       beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
        //       token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
        //       amount: 1000n
        //     }
        //   ] as Estate[],
        //   salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
        //   will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
        //   nonce: 244376007658491587519721798548739170223n as Nonce,
        //   deadline: 1789798304 as Timestamp,
        //   signature: {
        //     r: splitBigInt(BigInt("0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e")),
        //     s: splitBigInt(BigInt("0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c")),
        //     v: 27 // invalid signature
        //   } as EcdsaSignature
        // },
      ]

      for (const { testator, estates, will, nonce, deadline, signature } of testCases) {
        await circuit.expectFail(
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

    it("should ignore beneficiaries and salt", async function (): Promise<void> {
      const testCases = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c") + 1n, // invalid beneficiary
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n
            }
          ] as Estate[],
          salt: 0n, // invalid salt
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(BigInt("0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e")),
            s: splitBigInt(BigInt("0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c")),
            v: 28
          } as EcdsaSignature
        },
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
    }, 1200_000);

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should accept the verification for valid permit", async function (): Promise<void> {
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

    it("should reject the verification for invalid permit", async function (): Promise<void> {
      const testCases = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc") - 1n, // invalid testator
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
        },
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
          deadline: 1789652776 - 1 as Timestamp, // invalid deadline
          signature: {
            r: splitBigInt(BigInt("0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8")),
            s: splitBigInt(BigInt("0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef")),
            v: 27
          } as EcdsaSignature
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d") + 1n, // invalid token
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
        },
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
            v: 28 // invalid signature
          } as EcdsaSignature
        }
      ]

      for (const { testator, estates, will, nonce, deadline, signature } of testCases) {
        await circuit.expectFail(
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

    it("should ignore beneficiaries and salt", async function (): Promise<void> {
      const testCases = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c") + 1n, // invalid beneficiary
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c") - 1n,  // invalid beneficiary
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n
            }
          ] as Estate[],
          salt: 0n, // invalid salt
          will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
          nonce: 307798376644172688526653206965886192621n as Nonce,
          deadline: 1789652776 as Timestamp,
          signature: {
            r: splitBigInt(BigInt("0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8")),
            s: splitBigInt(BigInt("0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef")),
            v: 27
          } as EcdsaSignature
        },
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
