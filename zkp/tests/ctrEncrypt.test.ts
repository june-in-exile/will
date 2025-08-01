import { Byte, Byte16, Word } from "./type/index.js";
import { WitnessTester, wordToByte } from "./util/index.js";
import { AESUtils, ctrEncrypt } from "./logic/index.js";

describe("CtrEncrypt Circuits", function () {
  let circuit: WitnessTester<["plaintext", "key", "iv"], ["ciphertext"]>;

  describe("AES-128-CTR Encrypt Circuit", function () {
    describe("3 Bytes (With 13-byte Padding)", function () {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/ctrEncrypt.circom",
          "CtrEncrypt",
          {
            templateParams: ["128", "3"],
          },
        );
        circuit.setConstraint("AES-128-CTR 3-byte encryption");
      });

      it("should work with known test vectors", async function (): Promise<void> {
        const plaintext = [72, 105, 33] as Byte[]; // Hi!
        const key = [
          { bytes: [0xaa, 0x6a, 0x44, 0x59] },
          { bytes: [0x14, 0x10, 0xfb, 0x0d] },
          { bytes: [0x61, 0xa7, 0xac, 0x45] },
          { bytes: [0x62, 0x4a, 0x17, 0x15] },
        ] as Word[]; // qmpEWRQQ+w1hp6xFYkoXFQ==
        const iv = [
          0x57, 0xc9, 0x78, 0xbe, 0x1b, 0xe3, 0x40, 0xd6, 0x3b, 0x5e, 0xd5,
          0x47, 0xcb, 0x1f, 0xaa, 0x6a,
        ] as Byte16; // V8l4vhvjQNY7XtVHyx+qag==

        const ciphertext = [135, 69, 151]; // wodFwpc=

        expect(ctrEncrypt(plaintext, key, iv)).toStrictEqual(ciphertext);
        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext },
        );
      });

      it("should work with random test vectors", async function (): Promise<void> {
        const plaintext = Array.from(AESUtils.randomBytes(3)) as Byte[];
        const key = [
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
        ] as Word[];
        const iv = Array.from(AESUtils.randomBytes(16)) as Byte16;

        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext: ctrEncrypt(plaintext, key, iv) },
        );
      });
    });

    describe("16 Bytes (1 Block)", function () {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/ctrEncrypt.circom",
          "CtrEncrypt",
          {
            templateParams: ["128", "16"],
          },
        );
        circuit.setConstraint("AES-128-CTR 1-block encryption");
      });

      it("should work with known test vectors", async function (): Promise<void> {
        const plaintext = [
          72, 105, 33, 32, 72, 111, 119, 32, 97, 114, 101, 32, 121, 111, 117,
          63,
        ] as Byte[]; // Hi! How are you?
        const key = [
          { bytes: [0xaa, 0x6a, 0x44, 0x59] },
          { bytes: [0x14, 0x10, 0xfb, 0x0d] },
          { bytes: [0x61, 0xa7, 0xac, 0x45] },
          { bytes: [0x62, 0x4a, 0x17, 0x15] },
        ] as Word[]; // qmpEWRQQ+w1hp6xFYkoXFQ==
        const iv = [
          0x57, 0xc9, 0x78, 0xbe, 0x1b, 0xe3, 0x40, 0xd6, 0x3b, 0x5e, 0xd5,
          0x47, 0xcb, 0x1f, 0xaa, 0x6a,
        ] as Byte16; // V8l4vhvjQNY7XtVHyx+qag==

        const ciphertext = [
          0x87, 0x45, 0x97, 0xdd, 0xc8, 0x52, 0xd7, 0xe0, 0x03, 0xc7, 0x46,
          0x0c, 0xfd, 0xc0, 0x9f, 0xe3,
        ]; // h0WX3chS1+ADx0YM/cCf4w==

        expect(ctrEncrypt(plaintext, key, iv)).toStrictEqual(ciphertext);
        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext },
        );
      });
    });

    describe("47 Bytes (With 1-byte Padding)", function () {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/ctrEncrypt.circom",
          "CtrEncrypt",
          {
            templateParams: ["128", "47"],
          },
        );
        circuit.setConstraint("AES-128-CTR 47-byte encryption");
      });

      it("should work with random test vectors", async function (): Promise<void> {
        const plaintext = Array.from(AESUtils.randomBytes(47)) as Byte[];
        const key = [
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
        ] as Word[];
        const iv = Array.from(AESUtils.randomBytes(16)) as Byte16;

        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext: ctrEncrypt(plaintext, key, iv) },
        );
      });
    });

    describe("64 Bytes (4 Block)", function () {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/ctrEncrypt.circom",
          "CtrEncrypt",
          {
            templateParams: ["128", "64"],
          },
        );
        circuit.setConstraint("AES-128-CTR 4-block encryption");
      });

      it("should work with GCM standard test vectors", async function (): Promise<void> {
        // NIST SP 800-38A F.5.1 CTR-AES128.Encrypt Block #1-#4
        const plaintext = [
          0x6b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96, 0xe9, 0x3d, 0x7e,
          0x11, 0x73, 0x93, 0x17, 0x2a, 0xae, 0x2d, 0x8a, 0x57, 0x1e, 0x03,
          0xac, 0x9c, 0x9e, 0xb7, 0x6f, 0xac, 0x45, 0xaf, 0x8e, 0x51, 0x30,
          0xc8, 0x1c, 0x46, 0xa3, 0x5c, 0xe4, 0x11, 0xe5, 0xfb, 0xc1, 0x19,
          0x1a, 0x0a, 0x52, 0xef, 0xf6, 0x9f, 0x24, 0x45, 0xdf, 0x4f, 0x9b,
          0x17, 0xad, 0x2b, 0x41, 0x7b, 0xe6, 0x6c, 0x37, 0x10,
        ] as Byte[];
        const key = [
          { bytes: [0x2b, 0x7e, 0x15, 0x16] },
          { bytes: [0x28, 0xae, 0xd2, 0xa6] },
          { bytes: [0xab, 0xf7, 0x15, 0x88] },
          { bytes: [0x09, 0xcf, 0x4f, 0x3c] },
        ] as Word[];
        const iv = [
          0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
          0xfb, 0xfc, 0xfd, 0xfe, 0xff,
        ] as Byte16;

        const ciphertext = [
          0x87, 0x4d, 0x61, 0x91, 0xb6, 0x20, 0xe3, 0x26, 0x1b, 0xef, 0x68,
          0x64, 0x99, 0x0d, 0xb6, 0xce, 0x98, 0x06, 0xf6, 0x6b, 0x79, 0x70,
          0xfd, 0xff, 0x86, 0x17, 0x18, 0x7b, 0xb9, 0xff, 0xfd, 0xff, 0x5a,
          0xe4, 0xdf, 0x3e, 0xdb, 0xd5, 0xd3, 0x5e, 0x5b, 0x4f, 0x09, 0x02,
          0x0d, 0xb0, 0x3e, 0xab, 0x1e, 0x03, 0x1d, 0xda, 0x2f, 0xbe, 0x03,
          0xd1, 0x79, 0x21, 0x70, 0xa0, 0xf3, 0x00, 0x9c, 0xee,
        ];

        expect(ctrEncrypt(plaintext, key, iv)).toStrictEqual(ciphertext);
        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext },
        );
      });

      it("should handle edge case with maximum counter value", async function (): Promise<void> {
        const plaintext = new Array(64).fill(0x42) as Byte[]; // Non-zero plaintext
        const key = [
          { bytes: [0x01, 0x01, 0x01, 0x01] },
          { bytes: [0x01, 0x01, 0x01, 0x01] },
          { bytes: [0x01, 0x01, 0x01, 0x01] },
          { bytes: [0x01, 0x01, 0x01, 0x01] },
        ] as Word[];
        // Start with near-maximum counter
        const iv = [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
          0xff, 0xff, 0xff, 0xff, 0xfd,
        ] as Byte16; // Counter = 0xfffffffd

        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext: ctrEncrypt(plaintext, key, iv) },
        );
      });
    });
  });

  describe("AES-192-CTR Encrypt Circuit", function () {
    describe("30 Bytes (With 2-byte Padding)", function () {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/ctrEncrypt.circom",
          "CtrEncrypt",
          {
            templateParams: ["192", "30"],
          },
        );
        circuit.setConstraint("AES-192-CTR 30-byte encryption");
      });

      it("should work with random test vectors", async function (): Promise<void> {
        const plaintext = Array.from(AESUtils.randomBytes(30)) as Byte[];
        const key = [
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
        ] as Word[];
        const iv = Array.from(AESUtils.randomBytes(16)) as Byte16;

        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext: ctrEncrypt(plaintext, key, iv) },
        );
      });
    });

    describe("64 Bytes (4 Block)", function () {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/ctrEncrypt.circom",
          "CtrEncrypt",
          {
            templateParams: ["192", "64"],
          },
        );
        circuit.setConstraint("AES-192-CTR 4-block encryption");
      });

      it("should work with GCM standard test vectors", async function (): Promise<void> {
        // NIST SP 800-38A F.5.3 CTR-AES192.Encrypt Block #1-#4
        const plaintext = [
          0x6b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96, 0xe9, 0x3d, 0x7e,
          0x11, 0x73, 0x93, 0x17, 0x2a, 0xae, 0x2d, 0x8a, 0x57, 0x1e, 0x03,
          0xac, 0x9c, 0x9e, 0xb7, 0x6f, 0xac, 0x45, 0xaf, 0x8e, 0x51, 0x30,
          0xc8, 0x1c, 0x46, 0xa3, 0x5c, 0xe4, 0x11, 0xe5, 0xfb, 0xc1, 0x19,
          0x1a, 0x0a, 0x52, 0xef, 0xf6, 0x9f, 0x24, 0x45, 0xdf, 0x4f, 0x9b,
          0x17, 0xad, 0x2b, 0x41, 0x7b, 0xe6, 0x6c, 0x37, 0x10,
        ] as Byte[];
        const key = [
          { bytes: [0x8e, 0x73, 0xb0, 0xf7] },
          { bytes: [0xda, 0x0e, 0x64, 0x52] },
          { bytes: [0xc8, 0x10, 0xf3, 0x2b] },
          { bytes: [0x80, 0x90, 0x79, 0xe5] },
          { bytes: [0x62, 0xf8, 0xea, 0xd2] },
          { bytes: [0x52, 0x2c, 0x6b, 0x7b] },
        ] as Word[];
        const iv = [
          0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
          0xfb, 0xfc, 0xfd, 0xfe, 0xff,
        ] as Byte16;

        const ciphertext = [
          0x1a, 0xbc, 0x93, 0x24, 0x17, 0x52, 0x1c, 0xa2, 0x4f, 0x2b, 0x04,
          0x59, 0xfe, 0x7e, 0x6e, 0x0b, 0x09, 0x03, 0x39, 0xec, 0x0a, 0xa6,
          0xfa, 0xef, 0xd5, 0xcc, 0xc2, 0xc6, 0xf4, 0xce, 0x8e, 0x94, 0x1e,
          0x36, 0xb2, 0x6b, 0xd1, 0xeb, 0xc6, 0x70, 0xd1, 0xbd, 0x1d, 0x66,
          0x56, 0x20, 0xab, 0xf7, 0x4f, 0x78, 0xa7, 0xf6, 0xd2, 0x98, 0x09,
          0x58, 0x5a, 0x97, 0xda, 0xec, 0x58, 0xc6, 0xb0, 0x50,
        ];

        expect(ctrEncrypt(plaintext, key, iv)).toStrictEqual(ciphertext);
        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext },
        );
      });
    });
  });

  describe("AES-256-CTR Encrypt Circuit", function () {
    describe("17 Bytes (With 15-byte Padding)", function () {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/ctrEncrypt.circom",
          "CtrEncrypt",
          {
            templateParams: ["256", "17"],
          },
        );
        circuit.setConstraint("AES-256-CTR 17-byte encryption");
      });

      it("should work with random test vectors", async function (): Promise<void> {
        const plaintext = Array.from(AESUtils.randomBytes(17)) as Byte[];
        const key = [
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
          { bytes: Array.from(AESUtils.randomBytes(4)) },
        ] as Word[];
        const iv = Array.from(AESUtils.randomBytes(16)) as Byte16;

        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext: ctrEncrypt(plaintext, key, iv) },
        );
      });
    });

    describe("64 Bytes (4 Block)", function () {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/ctrEncrypt.circom",
          "CtrEncrypt",
          {
            templateParams: ["256", "64"],
          },
        );
        circuit.setConstraint("AES-256-CTR 4-block encryption");
      });

      it("should work with GCM standard test vectors", async function (): Promise<void> {
        // NIST SP 800-38A F.5.5 CTR-AES256.Encrypt Block #1-#4
        const plaintext = [
          0x6b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96, 0xe9, 0x3d, 0x7e,
          0x11, 0x73, 0x93, 0x17, 0x2a, 0xae, 0x2d, 0x8a, 0x57, 0x1e, 0x03,
          0xac, 0x9c, 0x9e, 0xb7, 0x6f, 0xac, 0x45, 0xaf, 0x8e, 0x51, 0x30,
          0xc8, 0x1c, 0x46, 0xa3, 0x5c, 0xe4, 0x11, 0xe5, 0xfb, 0xc1, 0x19,
          0x1a, 0x0a, 0x52, 0xef, 0xf6, 0x9f, 0x24, 0x45, 0xdf, 0x4f, 0x9b,
          0x17, 0xad, 0x2b, 0x41, 0x7b, 0xe6, 0x6c, 0x37, 0x10,
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
          0xfb, 0xfc, 0xfd, 0xfe, 0xff,
        ] as Byte16;
        const ciphertext = [
          0x60, 0x1e, 0xc3, 0x13, 0x77, 0x57, 0x89, 0xa5, 0xb7, 0xa7, 0xf5,
          0x04, 0xbb, 0xf3, 0xd2, 0x28, 0xf4, 0x43, 0xe3, 0xca, 0x4d, 0x62,
          0xb5, 0x9a, 0xca, 0x84, 0xe9, 0x90, 0xca, 0xca, 0xf5, 0xc5, 0x2b,
          0x09, 0x30, 0xda, 0xa2, 0x3d, 0xe9, 0x4c, 0xe8, 0x70, 0x17, 0xba,
          0x2d, 0x84, 0x98, 0x8d, 0xdf, 0xc9, 0xc5, 0x8d, 0xb6, 0x7a, 0xad,
          0xa6, 0x13, 0xc2, 0xdd, 0x08, 0x45, 0x79, 0x41, 0xa6,
        ];

        expect(ctrEncrypt(plaintext, key, iv)).toStrictEqual(ciphertext);
        await circuit.expectPass(
          { plaintext, key: wordToByte(key), iv },
          { ciphertext },
        );
      });
    });
  });
});
