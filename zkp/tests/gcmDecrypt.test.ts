import { Word, Byte } from "./type/index.js";
import { WitnessTester, wordToByte } from "./util/index.js";
import { gcmDecrypt } from "./logic/index.js";

describe("GcmDecrypt Circuits", function () {
  let circuit: WitnessTester<
    ["ciphertext", "key", "iv", "aad", "authTag"],
    ["plaintext"]
  >;

  describe("AES-256-GCM Decrypt Circuit", function () {
    describe("Standard IV (12 Bytes)", function () {
      describe("1-Block Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aesGcm/gcmDecrypt.circom",
            "GcmDecrypt",
            {
              templateParams: ["256", "12", "16", "0"],
            },
          );
          circuit.setConstraint(
            "AES-256-GCM standard IV, 1-block plaintext, no aad encryption",
          );
        });

        afterAll(async function (): Promise<void> {
          if (circuit) {
            await circuit.release();
          }
        });

        it("should accept correct authTag", { timeout: 15_000 }, async function (): Promise<void> {
          const ciphertext = [
            0x96, 0x9a, 0x3b, 0x49, 0x86, 0xc5, 0x48, 0x36, 0x6e, 0x36, 0xbf,
            0xa5, 0x71, 0xea, 0x8f, 0xbe,
          ] as Byte[];

          const key = [
            { bytes: [0x60, 0x3d, 0xeb, 0x10] },
            { bytes: [0x15, 0xca, 0x71, 0xbe] },
            { bytes: [0x2b, 0x73, 0xae, 0xf0] },
            { bytes: [0x85, 0x7d, 0x77, 0x81] },
            { bytes: [0x1f, 0x35, 0x2c, 0x07] },
            { bytes: [0x3b, 0x61, 0x08, 0xd7] },
            { bytes: [0x2d, 0x98, 0x10, 0xa3] },
            { bytes: [0x09, 0x14, 0xdf, 0xf4] },
          ] as Word[];
          const iv = [
            0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
            0xfb,
          ] as Byte[];
          const authTag = [
            0x7a, 0xba, 0xa0, 0xcf, 0xe5, 0x91, 0x45, 0x35, 0x45, 0x31, 0xa0,
            0xa1, 0xd1, 0x62, 0x3f, 0x73,
          ] as Byte[];
          const aad = [] as Byte[];

          const { plaintext /* "Hi! How are you?" */ } = gcmDecrypt(
            ciphertext,
            key,
            iv,
            authTag,
            aad,
          );

          await circuit.expectPass(
            { ciphertext, key: wordToByte(key), iv, authTag, aad },
            { plaintext },
          );
        });

        it("should reject incorrect authTag", async function (): Promise<void> {
          const ciphertext = [
            0x96, 0x9a, 0x3b, 0x49, 0x86, 0xc5, 0x48, 0x36, 0x6e, 0x36, 0xbf,
            0xa5, 0x71, 0xea, 0x8f, 0xbe,
          ] as Byte[];

          const key = [
            { bytes: [0x60, 0x3d, 0xeb, 0x10] },
            { bytes: [0x15, 0xca, 0x71, 0xbe] },
            { bytes: [0x2b, 0x73, 0xae, 0xf0] },
            { bytes: [0x85, 0x7d, 0x77, 0x81] },
            { bytes: [0x1f, 0x35, 0x2c, 0x07] },
            { bytes: [0x3b, 0x61, 0x08, 0xd7] },
            { bytes: [0x2d, 0x98, 0x10, 0xa3] },
            { bytes: [0x09, 0x14, 0xdf, 0xf4] },
          ] as Word[];
          const iv = [
            0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
            0xfb,
          ] as Byte[];
          const authTag = [
            0x7a, 0xba, 0xa0, 0xcf, 0xe5, 0x91, 0x45, 0x35, 0x45, 0x31, 0xa0,
            0xa1, 0xd1, 0x62, 0x3f, 0x72 /* the correct final byte is 0x73 */,
          ] as Byte[];
          const aad = [] as Byte[];

          await circuit.expectFail({
            ciphertext,
            key: wordToByte(key),
            iv,
            authTag,
            aad,
          });
        });
      });
    });
  });
});
