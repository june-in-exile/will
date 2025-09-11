import { flattenPermitTransferFrom, WitnessTester } from "./util/index.js";
import { hashPermit, hashTypedData } from "./logic/index.js";
import { Address, Byte32, PermitTransferFrom } from "./type/index.js";

describe("HashPermit Circuit", function () {
  let circuit: WitnessTester<["permit", "spender"], ["permitDigest"]>;

  describe("Hash Permit with 1 Estates", function (): void {
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
      const permit: PermitTransferFrom = {
        permitted: [
          {
            token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
            amount: 1000n,
          },
        ],
        nonce: 139895343447235933714306105636108089805n,
        deadline: 1788798363,
      };

      const spender: Address = BigInt(
        "0x80515F00edB3D90891D6494b63a58Dc06543bEF0",
      );

      const permitDigest = hashPermit(permit, spender);

      await circuit.expectPass(
        {
          permit: flattenPermitTransferFrom(permit),
          spender,
        },
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
      const permit: PermitTransferFrom = {
        permitted: [
          {
            token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
            amount: 1000n,
          },
          {
            token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
            amount: 5000000n,
          },
        ],
        nonce: 139895343447235933714306105636108089805n,
        deadline: 1788798363,
      };

      const spender: Address = BigInt(
        "0x80515F00edB3D90891D6494b63a58Dc06543bEF0",
      );

      const permitDigest = hashPermit(permit, spender);

      await circuit.expectPass(
        {
          permit: flattenPermitTransferFrom(permit),
          spender,
        },
        { permitDigest },
      );
    });
  });
});

describe("HashTypedData Circuit", function () {
  let circuit: WitnessTester<["permitDigest"], ["typedPermitDigest"]>;

  describe("Hash Typed Permit on Arbitrum Sepolia", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify.circom",
        "HashTypedData",
        {
          templateParams: ["421614"],
        },
      );
      circuit.setConstraint("arbitrum sepolia");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should produce arbitrum sepolia eip712 typed digest", async function (): Promise<void> {
      const permitDigest: Byte32 = [
        204, 139, 10, 23, 198, 237, 70, 122, 65, 124, 47, 49, 209, 170, 99, 40,
        181, 74, 207, 144, 241, 114, 19, 110, 89, 82, 145, 158, 190, 100, 178,
        116,
      ];

      const typedPermitDigest = hashTypedData(permitDigest);

      await circuit.expectPass(
        {
          permitDigest,
        },
        { typedPermitDigest },
      );
    });
  });

  describe("Hash Typed Permit on Mainnet", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify.circom",
        "HashTypedData",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("mainnet");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should produce mainnet eip712 typed digest", async function (): Promise<void> {
      const permitDigest: Byte32 = [
        204, 139, 10, 23, 198, 237, 70, 122, 65, 124, 47, 49, 209, 170, 99, 40,
        181, 74, 207, 144, 241, 114, 19, 110, 89, 82, 145, 158, 190, 100, 178,
        116,
      ];

      const typedPermitDigest = hashTypedData(permitDigest);

      await circuit.expectPass(
        {
          permitDigest,
        },
        { typedPermitDigest },
      );
    });
  });
});
