import { WitnessTester } from "./util/index.js";
import { hashPermit } from "./logic/index.js";
import { Estate, Address, Nonce, Timestamp } from "./type/index.js";

describe("HashPermit Circuit", function () {
  let circuit: WitnessTester<
    ["estates", "nonce", "deadline", "spender"],
    ["permitDigest"]
  >;

  describe.only("Hash Permit with 1 Estates", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify.circom",
        "HashPermit",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("permit with 1 estates");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should produce the correct digest", async function (): Promise<void> {
      // const estates: Estate[] = [
      //     {
      //         beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
      //         token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
      //         amount: 1000n,
      //     },
      // ];
      const estates = [
        BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
        BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
        1000n,
      ];

      const nonce: Nonce = 139895343447235933714306105636108089805n;
      const deadline: Timestamp = 1788798363;
      const spender: Address = BigInt(
        "0x80515F00edB3D90891D6494b63a58Dc06543bEF0",
      );

      const permitDigest = hashPermit(estates, nonce, deadline, spender);
      const permitDigest = [
        5151105621389530398n,
        4147583366056690493n,
        7706367556056788343n,
        3225360338761461087n,
      ];

      await circuit.expectPass(
        { estates, nonce, deadline, spender },
        { permitDigest },
      );
    });
  });

  describe("Hash Permit with 2 Estates", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify.circom",
        "HashPermit",
        {
          templateParams: ["2"],
        },
      );
      circuit.setConstraint("permit with 2 estates");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should produce the correct digest", async function (): Promise<void> {
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
      const nonce: Nonce = 139895343447235933714306105636108089805n;
      const deadline: Timestamp = 1788798363;
      const spender: Address = BigInt(
        "0x80515F00edB3D90891D6494b63a58Dc06543bEF0",
      );

      const permitDigest = hashPermit(estates, nonce, deadline, spender);

      await circuit.expectPass(
        { estates, nonce, deadline, spender },
        { permitDigest },
      );
    });
  });
});
