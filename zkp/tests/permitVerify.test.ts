import { flattenTokenPermissions, WitnessTester } from "./util/index.js";
import { hashPermit } from "./logic/index.js";
import { TokenPermission, Address, Nonce, Timestamp } from "./type/index.js";

describe("HashPermit Circuit", function () {
  let circuit: WitnessTester<
    ["permitted", "nonce", "deadline", "spender"],
    ["permitDigest"]
  >;

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
      const permitted: TokenPermission[] = [
        {
          token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
          amount: 1000n,
        },
      ];

      const nonce: Nonce = 139895343447235933714306105636108089805n;
      const deadline: Timestamp = 1788798363;
      const spender: Address = BigInt(
        "0x80515F00edB3D90891D6494b63a58Dc06543bEF0",
      );

      const permitDigest = hashPermit(permitted, nonce, deadline, spender);

      await circuit.expectPass(
        { permitted: flattenTokenPermissions(permitted), nonce, deadline, spender },
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
      const permitted: TokenPermission[] = [
        {
          token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
          amount: 1000n,
        },
        {
          token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
          amount: 5000000n,
        },
      ];
      const nonce: Nonce = 139895343447235933714306105636108089805n;
      const deadline: Timestamp = 1788798363;
      const spender: Address = BigInt(
        "0x80515F00edB3D90891D6494b63a58Dc06543bEF0",
      );

      const permitDigest = hashPermit(permitted, nonce, deadline, spender);

      await circuit.expectPass(
        { permitted: flattenTokenPermissions(permitted), nonce, deadline, spender },
        { permitDigest },
      );
    });
  });
});
