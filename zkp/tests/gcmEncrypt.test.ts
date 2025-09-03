import { Word, Byte, Byte12, Byte16 } from "./type/index.js";
import { WitnessTester, wordToByte } from "./util/index.js";
import {
  AESUtils, computeJ0Standard, computeJ0NonStandard, gcmEncrypt, gcmDecrypt
} from "./logic/index.js";

describe("ComputeJ0Standard Circuits", function () {
  describe("Compute J0 Standard Circuit", function () {
    let circuit: WitnessTester<["iv"], ["j0"]>;

    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
        "ComputeJ0Standard",
      );
      circuit.setConstraint("j0 computation for standard IV (12 bytes)");
    });

    it("should correctly compute J0 for 12-byte IV", async function (): Promise<void> {
      const testCases = [
        new Array(12).fill(0x00),
        new Array(12).fill(0xff),
        [
          0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
          0x0c,
        ],
      ] as Byte12[];

      for (const iv of testCases) {
        await circuit.expectPass({ iv: iv }, { j0: computeJ0Standard(iv) });
      }
    });

    it("should handle random 12-byte IVs", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const iv = Array.from(AESUtils.randomBytes(12)) as Byte12;

        await circuit.expectPass({ iv }, { j0: computeJ0Standard(iv) });
      }
    });
  });
});

describe("ComputeJ0NonStandard Circuit", function () {
  let circuit: WitnessTester<["iv", "hashKey"], ["j0"]>;

  it("should reject 0-byte IV input", async function (): Promise<void> {
    await expect(
      WitnessTester.construct(
        "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["0"],
        },
      ),
    ).rejects.toThrow();
  });

  it("should reject 12-byte IV input", async function (): Promise<void> {
    await expect(
      WitnessTester.construct(
        "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["12"],
        },
      ),
    ).rejects.toThrow();
  });

  describe("Compute J0 Non-Standard (8-Byte IV) Circuit", function () {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["8"],
        },
      );
      circuit.setConstraint("j0 computation for 8-byte IV");
    });

    it("should correctly compute J0 for 8-byte IV", async function (): Promise<void> {
      const iv = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08] as Byte[];
      const hashKey = Array.from(AESUtils.randomBytes(16)) as Byte16;

      await circuit.expectPass(
        { iv, hashKey },
        { j0: computeJ0NonStandard(iv, hashKey) },
      );
    });
  });

  describe("Compute J0 Non-Standard (16-Byte IV) Circuit", function () {
    let circuit: WitnessTester<["iv", "hashKey"], ["j0"]>;

    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
        "ComputeJ0NonStandard",
        {
          templateParams: ["16"],
        },
      );
      circuit.setConstraint("j0 computation for 16-byte IV");
    });

    it("should correctly compute J0 for 16-byte IV", async function (): Promise<void> {
      const testCases = [
        {
          iv: new Array(16).fill(0x00),
          hashKey: Array.from(AESUtils.randomBytes(16)),
        },
        {
          iv: Array.from({ length: 16 }, (_, i) => i),
          hashKey: [
            0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b, 0x88, 0x4c, 0xfa,
            0x59, 0xca, 0x34, 0x2b, 0x2e,
          ],
        },
        {
          iv: new Array(16).fill(0xff),
          hashKey: new Array(16).fill(0x55),
        },
      ] as { iv: Byte[]; hashKey: Byte16 }[];

      for (const { iv, hashKey } of testCases) {
        await circuit.expectPass(
          { iv, hashKey },
          { j0: computeJ0NonStandard(iv, hashKey) },
        );
      }
    });
  });

  describe("Varaible IV Lengths (Except for 12-Byte)", function () {
    it("should correctly compute J0 for different IV lengths", async function (): Promise<void> {
      const ivLengths = [1, 4, 7, 8, 13, 15, 16, 31, 32, 63, 64];

      for (const length of ivLengths) {
        const circuit = await WitnessTester.construct(
          "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
          "ComputeJ0NonStandard",
          {
            templateParams: [String(length)],
          },
        );
        circuit.setConstraint(`j0 computation for ${length}-byte IV`);

        for (let i = 0; i < 3; i++) {
          const iv = Array.from(AESUtils.randomBytes(length)) as Byte[];
          const hashKey = Array.from(AESUtils.randomBytes(16)) as Byte16;

          await circuit.expectPass(
            { iv, hashKey },
            { j0: computeJ0NonStandard(iv, hashKey) },
          );
        }
      }
    });
  });
});

describe("GcmEncrypt Circuits", function () {
  let circuit: WitnessTester<
    ["plaintext", "key", "iv", "aad"],
    ["ciphertext", "authTag"]
  >;

  describe("AES-128-GCM Encrypt Circuit", function () {
    describe("Standard IV (12 Bytes)", function () {
      describe("No Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["128", "12", "0", "0"],
            },
          );
          circuit.setConstraint(
            "AES-128-GCM standard IV, no plaintext, no aad encryption",
          );
        });

        it("should work with empty test vector", async function (): Promise<void> {
          const plaintext = [] as Byte[];
          const key = [
            { bytes: [0x00, 0x00, 0x00, 0x00] },
            { bytes: [0x00, 0x00, 0x00, 0x00] },
            { bytes: [0x00, 0x00, 0x00, 0x00] },
            { bytes: [0x00, 0x00, 0x00, 0x00] },
          ] as Word[];
          const iv = [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00,
          ] as Byte[];
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });

      describe("12-Byte Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["128", "12", "12", "0"],
            },
          );
          circuit.setConstraint(
            "AES-128-GCM standard IV, 12-byte plaintext, no aad encryption",
          );
        });

        it("should work with custom test vector", async function (): Promise<void> {
          const plaintext = [
            0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64,
            0x21,
          ] as Byte[]; // "Hello World!"
          const key = [
            { bytes: [0x2b, 0x7e, 0x15, 0x16] },
            { bytes: [0x28, 0xae, 0xd2, 0xa6] },
            { bytes: [0xab, 0xf7, 0x15, 0x88] },
            { bytes: [0x09, 0xcf, 0x4f, 0x3c] },
          ] as Word[];
          const iv = [
            0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
            0xfb,
          ] as Byte[];
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });

      describe("1-Block Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["128", "12", "16", "0"],
            },
          );
          circuit.setConstraint(
            "AES-128-GCM standard IV, 1-block plaintext, no aad encryption",
          );
        });

        it("should work with random test vector", async function (): Promise<void> {
          const plaintext = Array.from(AESUtils.randomBytes(16)) as Byte[];
          const key = [
            { bytes: Array.from(AESUtils.randomBytes(4)) },
            { bytes: Array.from(AESUtils.randomBytes(4)) },
            { bytes: Array.from(AESUtils.randomBytes(4)) },
            { bytes: Array.from(AESUtils.randomBytes(4)) },
          ] as Word[];
          const iv = Array.from(AESUtils.randomBytes(12)) as Byte[];
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });

      describe("2-Block Plaintext, 1-Block AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["128", "12", "32", "16"],
            },
          );
          circuit.setConstraint(
            "AES-128-GCM standard IV, 2-block plaintext, 1-block aad encryption",
          );
        });

        it("should work with custom test vector with 1-block AAD", async function (): Promise<void> {
          const plaintext = [
            0xd9, 0x31, 0x32, 0x25, 0xf8, 0x84, 0x06, 0xe5, 0xa5, 0x59, 0x09,
            0xc5, 0xaf, 0xf5, 0x26, 0x9a, 0x86, 0xa7, 0xa9, 0x53, 0x15, 0x34,
            0xf7, 0xda, 0x2e, 0x4c, 0x30, 0x3d, 0x8a, 0x31, 0x8a, 0x72,
          ] as Byte[];
          const key = [
            { bytes: [0xfe, 0xff, 0xe9, 0x92] },
            { bytes: [0x86, 0x65, 0x73, 0x1c] },
            { bytes: [0x6d, 0x6a, 0x8f, 0x94] },
            { bytes: [0x67, 0x30, 0x83, 0x08] },
          ] as Word[];
          const iv = [
            0xca, 0xfe, 0xba, 0xbe, 0xfa, 0xce, 0xdb, 0xad, 0xde, 0xca, 0xf8,
            0x88,
          ] as Byte[];
          const aad = [
            0xfe, 0xed, 0xfa, 0xce, 0xde, 0xad, 0xbe, 0xef, 0xfe, 0xed, 0xfa,
            0xce, 0xde, 0xad, 0xbe, 0xef,
          ] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });

      describe("2-Block Plaintext, 30-Byte AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["128", "12", "32", "30"],
            },
          );
          circuit.setConstraint(
            "AES-128-GCM standard IV, 2-block plaintext, 30-byte aad encryption",
          );
        });

        it("should work with 30-byte AAD", async function (): Promise<void> {
          const plaintext = Array.from(AESUtils.randomBytes(32)) as Byte[];
          const key = [
            { bytes: [0x60, 0x3d, 0xeb, 0x10] },
            { bytes: [0x15, 0xca, 0x71, 0xbe] },
            { bytes: [0x2b, 0x73, 0xae, 0xf0] },
            { bytes: [0x85, 0x7d, 0x77, 0x81] },
          ] as Word[];
          const iv = [
            0xca, 0xfe, 0xba, 0xbe, 0xfa, 0xce, 0xdb, 0xad, 0xde, 0xca, 0xf8,
            0x88,
          ] as Byte[];
          const aad = Array.from(AESUtils.randomBytes(30)) as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });
    });

    describe("Non-Standard IV", function () {
      describe("1-Byte IV, 1-Block Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["128", "1", "16", "0"],
            },
          );
          circuit.setConstraint(
            "AES-128-GCM 1-byte IV, 1-block plaintext, no aad encryption",
          );
        });

        it("should work with 1-byte IV", async function (): Promise<void> {
          const plaintext = [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
            0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
          ] as Byte[];
          const key = [
            { bytes: [0x2b, 0x7e, 0x15, 0x16] },
            { bytes: [0x28, 0xae, 0xd2, 0xa6] },
            { bytes: [0xab, 0xf7, 0x15, 0x88] },
            { bytes: [0x09, 0xcf, 0x4f, 0x3c] },
          ] as Word[];
          const iv = [0x12] as Byte[];
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });

      describe("8-Byte IV, 1-Block Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["128", "8", "16", "0"],
            },
          );
          circuit.setConstraint(
            "AES-128-GCM 8-byte IV, 1-block plaintext, no aad encryption",
          );
        });

        it("should work with 8-byte IV", async function (): Promise<void> {
          const plaintext = [
            0x54, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x74,
            0x65, 0x73, 0x74, 0x21, 0x00,
          ] as Byte[]; // "This is a test!"
          const key = [
            { bytes: [0x00, 0x01, 0x02, 0x03] },
            { bytes: [0x04, 0x05, 0x06, 0x07] },
            { bytes: [0x08, 0x09, 0x0a, 0x0b] },
            { bytes: [0x0c, 0x0d, 0x0e, 0x0f] },
          ] as Word[];
          const iv = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08] as Byte[];
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });
    });
  });

  describe("AES-192-GCM Encrypt Circuit", function () {
    describe("Standard IV (12 Bytes)", function () {
      describe("1-Block Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["192", "12", "16", "0"],
            },
          );
          circuit.setConstraint(
            "AES-192-GCM standard IV, 1-block plaintext, no aad encryption",
          );
        });

        it("should work with zero test vector", async function (): Promise<void> {
          const plaintext = [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00,
          ] as Byte[];
          const iv = [
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00,
          ] as Byte[];
          const key = [
            { bytes: [0x00, 0x00, 0x00, 0x00] },
            { bytes: [0x00, 0x00, 0x00, 0x00] },
            { bytes: [0x00, 0x00, 0x00, 0x00] },
            { bytes: [0x00, 0x00, 0x00, 0x00] },
            { bytes: [0x00, 0x00, 0x00, 0x00] },
            { bytes: [0x00, 0x00, 0x00, 0x00] },
          ] as Word[];
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });

        it("should work with custom test vector", async function (): Promise<void> {
          const plaintext = [
            0x54, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x41, 0x45, 0x53,
            0x2d, 0x31, 0x39, 0x32, 0x00,
          ] as Byte[]; // "This is AES-192" + null
          const iv = [
            0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
            0xfb,
          ] as Byte[];
          const key = [
            { bytes: [0x8e, 0x73, 0xb0, 0xf7] },
            { bytes: [0xda, 0x0e, 0x64, 0x52] },
            { bytes: [0xc8, 0x10, 0xf3, 0x2b] },
            { bytes: [0x80, 0x90, 0x79, 0xe5] },
            { bytes: [0x62, 0xf8, 0xea, 0xd2] },
            { bytes: [0x52, 0x2c, 0x6b, 0x7b] },
          ] as Word[];
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });

      describe("12-Byte Plaintext, 5-Byte AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["192", "12", "12", "5"],
            },
          );
          circuit.setConstraint(
            "AES-192-GCM standard IV, 12-byte plaintext, 5-byte aad encryption",
          );
        });

        it("should work with 5-byte AAD", async function (): Promise<void> {
          const plaintext = [
            0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64,
            0x21,
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
            0xfb,
          ] as Byte[];
          const aad = [0x41, 0x42, 0x43, 0x44, 0x45] as Byte[]; // "ABCDE"

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });

      describe("2-Block Plaintext, 1-Block AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["192", "12", "32", "16"],
            },
          );
          circuit.setConstraint(
            "AES-192-GCM standard IV, 2-block plaintext, 1-block aad encryption",
          );
        });

        it("should work with custom test vector with 1-block AAD", async function (): Promise<void> {
          const plaintext = [
            0xd9, 0x31, 0x32, 0x25, 0xf8, 0x84, 0x06, 0xe5, 0xa5, 0x59, 0x09,
            0xc5, 0xaf, 0xf5, 0x26, 0x9a, 0x86, 0xa7, 0xa9, 0x53, 0x15, 0x34,
            0xf7, 0xda, 0x2e, 0x4c, 0x30, 0x3d, 0x8a, 0x31, 0x8a, 0x72,
          ] as Byte[];
          const iv = [
            0xca, 0xfe, 0xba, 0xbe, 0xfa, 0xce, 0xdb, 0xad, 0xde, 0xca, 0xf8,
            0x88,
          ] as Byte[];
          const key = [
            { bytes: [0x8e, 0x73, 0xb0, 0xf7] },
            { bytes: [0xda, 0x0e, 0x64, 0x52] },
            { bytes: [0xc8, 0x10, 0xf3, 0x2b] },
            { bytes: [0x80, 0x90, 0x79, 0xe5] },
            { bytes: [0x62, 0xf8, 0xea, 0xd2] },
            { bytes: [0x52, 0x2c, 0x6b, 0x7b] },
          ] as Word[];
          const aad = [
            0xfe, 0xed, 0xfa, 0xce, 0xde, 0xad, 0xbe, 0xef, 0xfe, 0xed, 0xfa,
            0xce, 0xde, 0xad, 0xbe, 0xef,
          ] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });
    });
  });

  describe("AES-256-GCM Encrypt Circuit", function () {
    describe("Standard IV (12 Bytes)", function () {
      describe("1-Block Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["256", "12", "16", "0"],
            },
          );
          circuit.setConstraint(
            "AES-256-GCM standard IV, 1-block plaintext, no aad encryption",
          );
        });

        it("should work with custom test vector", async function (): Promise<void> {
          const plaintext = [
            0x48, 0x69, 0x21, 0x20, 0x48, 0x6f, 0x77, 0x20, 0x61, 0x72, 0x65,
            0x20, 0x79, 0x6f, 0x75, 0x3f,
          ] as Byte[]; // "Hi! How are you?"
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
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });

      describe("2-Block Plaintext, 1-Block AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["256", "12", "32", "16"],
            },
          );
          circuit.setConstraint(
            "AES-256-GCM standard IV, 2-block plaintext, 1-block aad encryption",
          );
        });

        it("should work with custom test vector with 1-block AAD", async function (): Promise<void> {
          const plaintext = [
            0xd9, 0x31, 0x32, 0x25, 0xf8, 0x84, 0x06, 0xe5, 0xa5, 0x59, 0x09,
            0xc5, 0xaf, 0xf5, 0x26, 0x9a, 0x86, 0xa7, 0xa9, 0x53, 0x15, 0x34,
            0xf7, 0xda, 0x2e, 0x4c, 0x30, 0x3d, 0x8a, 0x31, 0x8a, 0x72,
          ] as Byte[];
          const iv = [
            0xca, 0xfe, 0xba, 0xbe, 0xfa, 0xce, 0xdb, 0xad, 0xde, 0xca, 0xf8,
            0x88,
          ] as Byte[];
          const key = [
            { bytes: [0xfe, 0xff, 0xe9, 0x92] },
            { bytes: [0x86, 0x65, 0x73, 0x1c] },
            { bytes: [0x6d, 0x6a, 0x8f, 0x94] },
            { bytes: [0x67, 0x30, 0x83, 0x08] },
            { bytes: [0xfe, 0xff, 0xe9, 0x92] },
            { bytes: [0x86, 0x65, 0x73, 0x1c] },
            { bytes: [0x6d, 0x6a, 0x8f, 0x94] },
            { bytes: [0x67, 0x30, 0x83, 0x08] },
          ] as Word[];
          const aad = [
            0xfe, 0xed, 0xfa, 0xce, 0xde, 0xad, 0xbe, 0xef, 0xfe, 0xed, 0xfa,
            0xce, 0xde, 0xad, 0xbe, 0xef,
          ] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });

        it("should handle edge case with maximum values", async function (): Promise<void> {
          const plaintext = new Array(32).fill(0xff) as Byte[]; // Maximum byte values
          const iv = [
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff,
          ] as Byte[];
          const key = [
            { bytes: [0xff, 0xff, 0xff, 0xff] },
            { bytes: [0xff, 0xff, 0xff, 0xff] },
            { bytes: [0xff, 0xff, 0xff, 0xff] },
            { bytes: [0xff, 0xff, 0xff, 0xff] },
            { bytes: [0xff, 0xff, 0xff, 0xff] },
            { bytes: [0xff, 0xff, 0xff, 0xff] },
            { bytes: [0xff, 0xff, 0xff, 0xff] },
            { bytes: [0xff, 0xff, 0xff, 0xff] },
          ] as Word[];
          const aad = new Array(16).fill(0xaa) as Byte[]; // Pattern AAD

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });
    });

    describe("Non-Standard IV", function () {
      describe("16-Byte IV, 1-Block Plaintext, No AAD", function () {
        beforeAll(async function (): Promise<void> {
          circuit = await WitnessTester.construct(
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmEncrypt",
            {
              templateParams: ["256", "16", "16", "0"],
            },
          );
          circuit.setConstraint(
            "AES-256-GCM 16-byte IV, 1-block plaintext, no aad encryption",
          );
        });

        it("should work with 16-byte IV", async function (): Promise<void> {
          const plaintext = [
            0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa,
            0xbb, 0xcc, 0xdd, 0xee, 0xff,
          ] as Byte[];
          const iv = [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
            0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
          ] as Byte[];
          const key = [
            { bytes: [0x00, 0x01, 0x02, 0x03] },
            { bytes: [0x04, 0x05, 0x06, 0x07] },
            { bytes: [0x08, 0x09, 0x0a, 0x0b] },
            { bytes: [0x0c, 0x0d, 0x0e, 0x0f] },
            { bytes: [0x10, 0x11, 0x12, 0x13] },
            { bytes: [0x14, 0x15, 0x16, 0x17] },
            { bytes: [0x18, 0x19, 0x1a, 0x1b] },
            { bytes: [0x1c, 0x1d, 0x1e, 0x1f] },
          ] as Word[];
          const aad = [] as Byte[];

          const { ciphertext, authTag } = gcmEncrypt(plaintext, key, iv, aad);

          await circuit.expectPass(
            { plaintext, key: wordToByte(key), iv, aad },
            { ciphertext, authTag },
          );
        });
      });
    });
  });
});

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
            "circuits/shared/components/aes-gcm/gcmEncrypt.circom",
            "GcmDecrypt",
            {
              templateParams: ["256", "12", "16", "0"],
            },
          );
          circuit.setConstraint(
            "AES-256-GCM standard IV, 1-block plaintext, no aad encryption",
          );
        });

        it("should accept correct authTag", async function (): Promise<void> {
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
