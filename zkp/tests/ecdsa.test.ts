import {
  WitnessTester,
  splitBigInt,
  ecdsaPointToBigInts,
} from "./util/index.js";
import { ECDSA, ECDSAUtils, MathUtils } from "./logic/index.js";
import { ecdsaPrivToPub, ecdsaVerifyNoPubkeyCheck } from "./logic/ecdsa.js";

describe("ECDSAPrivToPub Circuit", function () {
  let circuit: WitnessTester<["privkey"], ["pubkey"]>;

  describe("ECDSA Private Key to Public Key", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/ecdsa/ecdsa.circom",
        "ECDSAPrivToPub",
        {
          templateParams: ["64", "4"],
        },
      );
      circuit.setConstraint("calculate ecdsa public key from private key");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should calculate the correct public key", async function (): Promise<void> {
      const keyPair = ECDSA.generateKeyPair();
      const privkey = splitBigInt(keyPair.privateKey);
      const pubkey = ecdsaPrivToPub(privkey);

      await circuit.expectPass({ privkey }, { pubkey });
    });
  });
});

describe("ECDSAVerifyNoPubkeyCheck Circuit", function () {
  let circuit: WitnessTester<["r", "s", "msghash", "pubkey"], ["result"]>;

  describe("256-Bit Message Hash Signature Verification Without Checking Public Key", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/ecdsa/ecdsa.circom",
        "ECDSAVerifyNoPubkeyCheck",
        {
          templateParams: ["64", "4"],
        },
      );
      circuit.setConstraint(
        "256-bit message hash signature verification w/o checking public key",
      );
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should verify fixed signature", async function (): Promise<void> {
      const r = [
        BigInt("11878389131962663075"),
        BigInt("9922462056030557342"),
        BigInt("6756396965793543634"),
        BigInt("12446269625364732260"),
      ];

      const s = [
        BigInt("18433728439776304144"),
        BigInt("9948993517021512060"),
        BigInt("8616204783675899344"),
        BigInt("12630110559440107129"),
      ];

      const msghash = [
        BigInt("7828219513492386041"),
        BigInt("3988479630986735061"),
        BigInt("17828618373474417767"),
        BigInt("7725776341465200115"),
      ];

      const pubkey = [
        [
          BigInt("15936664623177566288"),
          BigInt("3250397285527463885"),
          BigInt("12867682233480762946"),
          BigInt("7876377878669208042"),
        ],
        [
          BigInt("17119974326854866418"),
          BigInt("4804456518640350784"),
          BigInt("12443422089272457229"),
          BigInt("9048921188902050084"),
        ],
      ];

      const result = ecdsaVerifyNoPubkeyCheck(r, s, msghash, pubkey);

      await circuit.expectPass({ r, s, msghash, pubkey }, { result });
    });

    it("should verify random signature with fixed message hash", async function (): Promise<void> {
      const messages = ["", "a", "Hello, ECDSA!", "1234567890ABCDEF"];
      for (const message in messages) {
        const messageHash = ECDSAUtils.hashMessage(message);
        const msghash = splitBigInt(messageHash);

        const keyPair = ECDSA.generateKeyPair();
        const pubkey = ecdsaPointToBigInts(keyPair.publicKey);

        const signature = ECDSA.sign(messageHash, keyPair.privateKey);
        const r = splitBigInt(signature.r);
        const s = splitBigInt(signature.s);

        const result = ecdsaVerifyNoPubkeyCheck(r, s, msghash, pubkey);

        await circuit.expectPass({ r, s, msghash, pubkey }, { result });
      }
    });

    it("should verify random signature with random message hash", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const messageHash = MathUtils.generateRandomScalar();
        const msghash = splitBigInt(messageHash);

        const keyPair = ECDSA.generateKeyPair();
        const pubkey = ecdsaPointToBigInts(keyPair.publicKey);

        const signature = ECDSA.sign(messageHash, keyPair.privateKey);
        const r = splitBigInt(signature.r);
        const s = splitBigInt(signature.s);

        const result = ecdsaVerifyNoPubkeyCheck(r, s, msghash, pubkey);

        await circuit.expectPass({ r, s, msghash, pubkey }, { result });
      }
    });
  });
});
