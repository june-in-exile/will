import { Byte4, Word } from "./type/index.js";
import { WitnessTester } from "./util/index.js";
import { expandKey } from "./logic/index.js";

describe("ExpandKey Circuit", function () {
  let circuit: WitnessTester<["key"], ["roundKey"]>;

  describe("Key Expansion for AES-128", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/keyExpansion.circom",
        "ExpandKey",
        {
          templateParams: ["128"],
        },
      );
      circuit.setConstraint("AES-128 key expansion");
    });

    it("should expand 16-byte key to 176-byte correctly", async function (): Promise<void> {
      const key = [
        0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6, 0xab, 0xf7, 0x15, 0x88,
        0x09, 0xcf, 0x4f, 0x3c,
      ];

      const keyBytes: Word[] = [];
      for (let i = 0; i < key.length; i += 4) {
        keyBytes.push({
          bytes: key.slice(i, i + 4) as Byte4,
        });
      }

      await circuit.expectPass({ key }, { roundKey: expandKey(keyBytes) });
    });
  });

  describe("Key Expansion for AES-192", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/keyExpansion.circom",
        "ExpandKey",
        {
          templateParams: ["192"],
        },
      );
      circuit.setConstraint("AES-192 key expansion");
    });

    it("should expand 24-byte key to 208-byte correctly", async function (): Promise<void> {
      const key = [
        0x8e, 0x73, 0xb0, 0xf7, 0xda, 0x0e, 0x64, 0x52, 0xc8, 0x10, 0xf3, 0x2b,
        0x80, 0x90, 0x79, 0xe5, 0x62, 0xf8, 0xea, 0xd2, 0x52, 0x2c, 0x6b, 0x7b,
      ];

      const keyBytes: Word[] = [];
      for (let i = 0; i < key.length; i += 4) {
        keyBytes.push({
          bytes: key.slice(i, i + 4) as Byte4,
        });
      }
      await circuit.expectPass({ key }, { roundKey: expandKey(keyBytes) });
    });
  });

  describe("Key Expansion for AES-256", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes-gcm/keyExpansion.circom",
        "ExpandKey",
        {
          templateParams: ["256"],
        },
      );
      circuit.setConstraint("AES-256 key expansion");
    });

    it("should expand 32-byte key to 240-byte correctly", async function (): Promise<void> {
      const key = [
        0xaa, 0x6a, 0x44, 0x59, 0x14, 0x10, 0xfb, 0x0d, 0x61, 0xa7, 0xac, 0x45,
        0x62, 0x4a, 0x17, 0x15, 0x41, 0xd9, 0x03, 0xc3, 0xac, 0xef, 0x55, 0xd3,
        0x5b, 0x10, 0xd9, 0x21, 0xd3, 0x40, 0x4b, 0xba,
      ];

      const keyBytes: Word[] = [];
      for (let i = 0; i < key.length; i += 4) {
        keyBytes.push({
          bytes: key.slice(i, i + 4) as Byte4,
        });
      }

      await circuit.expectPass({ key }, { roundKey: expandKey(keyBytes) });
    });
  });
});
