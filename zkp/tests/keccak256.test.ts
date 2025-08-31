import { WitnessTester } from "./util/index.js";
import { Keccak256 } from "./logic/index.js";
import { hexToByte } from "./util/index.js"

describe("Keccak256Hash Circuit", function () {
  let circuit: WitnessTester<["msg"], ["digest"]>;

  // 1 block is 1088 bits / 8 = 136 bytes
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
      const digest = Keccak256.hash(randomBytes);

      await circuit.expectPass(
        { msg: Array.from(randomBytes) },
        { digest: hexToByte(digest) },
      );
    });
  });

  describe("Hash More Than One Block", function (): void {
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

      await circuit.expectPass(
        { msg: Array.from(randomBytes) },
        { digest: hexToByte(digest) },
      );
    });
  });
});
