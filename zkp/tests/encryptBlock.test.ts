import { byteToWord, WitnessTester, wordToByte } from "./utils";
import { AESUtils, encryptBlock } from "./helpers";

describe("EncryptBlock Circuit", function () {
  let circuit: WitnessTester<["plaintext", "key"], ["ciphertext"]>;

  describe.only("AES-256 Block Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/encryptBlock.circom",
        "EncryptBlock", {
        templateParams: ["256"],
      });
      console.info(
        "AES-256 block cipher circuit constraints:",
        await circuit.getConstraintCount(), // 123264
      );
    });

    it("should correctly encrypt using NIST test vectors", async function (): Promise<void> {
      const testCases = [
        {
          // NIST FIPS 197 Appendix C.3
          plaintext: [
            0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
            0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff
          ],
          key: [
            { bytes: [0x00, 0x01, 0x02, 0x03] },
            { bytes: [0x04, 0x05, 0x06, 0x07] },
            { bytes: [0x08, 0x09, 0x0a, 0x0b] },
            { bytes: [0x0c, 0x0d, 0x0e, 0x0f] },
            { bytes: [0x10, 0x11, 0x12, 0x13] },
            { bytes: [0x14, 0x15, 0x16, 0x17] },
            { bytes: [0x18, 0x19, 0x1a, 0x1b] },
            { bytes: [0x1c, 0x1d, 0x1e, 0x1f] }
          ],
          ciphertext: [
            0x8e, 0xa2, 0xb7, 0xca, 0x51, 0x67, 0x45, 0xbf,
            0xea, 0xfc, 0x49, 0x90, 0x4b, 0x49, 0x60, 0x89
          ]
        },
        {
          // NIST SP 800-38A F.1.5 ECB-AES256.Encrypt Block #1
          plaintext: [
            0x6b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96,
            0xe9, 0x3d, 0x7e, 0x11, 0x73, 0x93, 0x17, 0x2a
          ],
          key: [
            { bytes: [0x60, 0x3d, 0xeb, 0x10] },
            { bytes: [0x15, 0xca, 0x71, 0xbe] },
            { bytes: [0x2b, 0x73, 0xae, 0xf0] },
            { bytes: [0x85, 0x7d, 0x77, 0x81] },
            { bytes: [0x1f, 0x35, 0x2c, 0x07] },
            { bytes: [0x3b, 0x61, 0x08, 0xd7] },
            { bytes: [0x2d, 0x98, 0x10, 0xa3] },
            { bytes: [0x09, 0x14, 0xdf, 0xf4] }
          ],
          ciphertext: [
            0xf3, 0xee, 0xd1, 0xbd, 0xb5, 0xd2, 0xa0, 0x3c,
            0x06, 0x4b, 0x5a, 0x7e, 0x3d, 0xb1, 0x81, 0xf8
          ]
        }
      ];

      for (const { plaintext, key, ciphertext } of testCases) {
        await circuit.expectPass(
          { plaintext, key: wordToByte(key as Word[]) },
          { ciphertext }
        );
      }
    });


    it("should handle random inputs consistently", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const plaintext = Array.from(AESUtils.randomBytes(16)) as Byte16;
        const key = Array.from(AESUtils.randomBytes(32)) as Byte[];

        const ciphertext = encryptBlock(plaintext, byteToWord(key));

        await circuit.expectPass(
          { plaintext, key },
          { ciphertext }
        );
      }
    });
  });
});