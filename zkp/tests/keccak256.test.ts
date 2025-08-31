import { WitnessTester } from "./util/index.js";
import { Keccak256, Keccak256Utils } from "./logic/index.js";

describe.only("Keccak256Hash Circuit", function () {
  let circuit: WitnessTester<["msg"], ["digest"]>;

  describe("Hash Less Than One Block", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccak256.circom",
        "Keccak256Hash",
        {
          templateParams: ["16"],
        },
      );
      circuit.setConstraint("16-byte massage (less than one block)");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(16));
      console.log(`randomBytes: ${randomBytes}`);
      const digest = Keccak256.hash(randomBytes);
      const digestBytes = Keccak256Utils.hexToBytes(digest);
      console.log(`digestBytes: ${digestBytes}`);

      await circuit.expectPass(
        { msg: Array.from(randomBytes) },
        { digest: Array.from(digestBytes) },
      );
    });
  });

  describe.skip("Hash Exactly One Block", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccak256.circom",
        "Keccak256Hash",
        {
          templateParams: ["136"],
        },
      );
      circuit.setConstraint("136-byte massage (equal to one block)");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(136));
      const digest = Keccak256.hash(randomBytes);
      const digestBytes = Keccak256Utils.hexToBytes(digest);

      await circuit.expectPass(
        { msg: Array.from(randomBytes) },
        { digest: Array.from(digestBytes) },
      );
    });
  });

  describe.skip("Hash More Than One Block", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/keccak256/keccak256.circom",
        "Keccak256Hash",
        {
          templateParams: ["170"],
        },
      );
      circuit.setConstraint("170-byte massage (more than one block)");
    });

    it("should calculate the correct hash", async function (): Promise<void> {
      const randomBytes = crypto.getRandomValues(new Uint8Array(170));
      const digest = Keccak256.hash(randomBytes);
      const digestBytes = Keccak256Utils.hexToBytes(digest);

      await circuit.expectPass(
        { msg: Array.from(randomBytes) },
        { digest: Array.from(digestBytes) },
      );
    });
  });
});
