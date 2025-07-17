import { WitnessTester } from "./utils";
import { ctrEncrypt } from "./helpers";

describe("CtrEncrypt Circuits", function () {
    let circuit: WitnessTester<["plaintext", "key", "j0", "numBlocks"], ["ciphertext"]>;

    describe("CTR Encrypt Circuit - AES-128", function () {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/aes256ctr/ctrEncrypt.circom",
                "CTREncrypt",
                {
                    templateParams: ["128", "4"],
                }
            );
            console.info(
                "AES-128 CTR encryption circuit constraints:",
                await circuit.getConstraintCount(),
            );
        });

        it("should correctly encrypt single block with zero plaintext", async function (): Promise<void> {
            const plaintext = new Array(64).fill(0x00) as Byte[];
            const key = [
                { bytes: [0x2b, 0x7e, 0x15, 0x16] },
                { bytes: [0x28, 0xae, 0xd2, 0xa6] },
                { bytes: [0xab, 0xf7, 0x15, 0x88] },
                { bytes: [0x09, 0xcf, 0x4f, 0x3c] },
            ] as Word[];
            const j0 = [
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
                0x09, 0x0a, 0x0b, 0x0c, 0x00, 0x00, 0x00, 0x01,
            ] as Byte16;
            const numBlocks = 1;

            circuit.expectPass({ plaintext, key, j0, numBlocks }, { ciphertext: ctrEncrypt(plaintext, key, j0, numBlocks) })
        });

        it("should correctly handle multiple blocks", async function (): Promise<void> {
            const plaintext = [
                // Block 1
                0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
                0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10,
                // Block 2
                0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
                0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00,
            ] as Byte[];

            const key = [
                { bytes: [0x00, 0x01, 0x02, 0x03] },
                { bytes: [0x04, 0x05, 0x06, 0x07] },
                { bytes: [0x08, 0x09, 0x0a, 0x0b] },
                { bytes: [0x0c, 0x0d, 0x0e, 0x0f] },
            ] as Word[];

            const j0 = [
                0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
                0x11, 0x22, 0x33, 0x44, 0x00, 0x00, 0x00, 0x01,
            ] as Byte16;

            const numBlocks = 2;

            circuit.expectPass({ plaintext, key, j0, numBlocks }, { ciphertext: ctrEncrypt(plaintext, key, j0, numBlocks) })
        });

        it("should handle partial block processing", async function (): Promise<void> {
            const plaintext = [
                // Block 1 - will be processed
                0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11,
                0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99,
                // Blocks 2-4 - should remain as plaintext
                ...Array.from({ length: 48 }, (_, i) => i % 256),
            ] as Byte[];

            const key = [
                { bytes: [0x12, 0x34, 0x56, 0x78] },
                { bytes: [0x9a, 0xbc, 0xde, 0xf0] },
                { bytes: [0x13, 0x57, 0x9b, 0xdf] },
                { bytes: [0x02, 0x46, 0x8a, 0xce] },
            ] as Word[];

            const j0 = [
                0xa1, 0xb2, 0xc3, 0xd4, 0xe5, 0xf6, 0x07, 0x18,
                0x29, 0x3a, 0x4b, 0x5c, 0x00, 0x00, 0x00, 0x05,
            ] as Byte16;

            const numBlocks = 1;

            circuit.expectPass({ plaintext, key, j0, numBlocks }, { ciphertext: ctrEncrypt(plaintext, key, j0, numBlocks) })
        });

        it("should work with GCM standard test vectors", async function (): Promise<void> {
            // NIST SP 800-38A F.5.1 CTR-AES128.Encrypt Block #1-#4
            const plaintext = [
                0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
                0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff,
                0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
                0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xff, 0x00,
                0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
                0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xff, 0x01,
                0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
                0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xff, 0x02,
            ] as Byte[];

            const key = [
                { bytes: [0x2b, 0x7e, 0x15, 0x16] },
                { bytes: [0x28, 0xae, 0xd2, 0xa6] },
                { bytes: [0xab, 0xf7, 0x15, 0x88] },
                { bytes: [0x09, 0xcf, 0x4f, 0x3c] },
            ] as Word[];

            const j0 = [
                0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
                0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff
            ] as Byte16;

            const numBlocks = 4;

            await circuit.expectPass({ plaintext, key, j0, numBlocks }, { ciphertext: ctrEncrypt(plaintext, key, j0, numBlocks) });
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
            const j0 = [
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfd, // Counter = 0xfffffffd
            ] as Byte16;

            const numBlocks = 4;

            await circuit.expectPass({ plaintext, key, j0, numBlocks }, { ciphertext: ctrEncrypt(plaintext, key, j0, numBlocks) });
        });
    });

    describe("CTR Encrypt Circuit - Different Key Sizes", function () {
        it("should work with AES-192", async function (): Promise<void> {
            const circuit192 = await WitnessTester.construct(
                "circuits/shared/components/aes256ctr/ctrEncrypt.circom",
                "CTREncrypt",
                {
                    templateParams: ["192", "2"],
                }
            );

            const plaintext = new Array(32).fill(0x33) as Byte[];

            const key = [
                { bytes: [0x12, 0x34, 0x56, 0x78] },
                { bytes: [0x9a, 0xbc, 0xde, 0xf0] },
                { bytes: [0x11, 0x22, 0x33, 0x44] },
                { bytes: [0x55, 0x66, 0x77, 0x88] },
                { bytes: [0x99, 0xaa, 0xbb, 0xcc] },
                { bytes: [0xdd, 0xee, 0xff, 0x00] },
            ] as Word[];

            const j0 = Array.from({ length: 16 }, (_, i) => (i + 1) % 256) as Byte16;

            const numBlocks = 2;

            await circuit192.expectPass({ plaintext, key, j0, numBlocks }, { ciphertext: ctrEncrypt(plaintext, key, j0, numBlocks) });
        });

        it("should work with AES-256", async function (): Promise<void> {
            const circuit256 = await WitnessTester.construct(
                "circuits/shared/components/aes256ctr/ctrEncrypt.circom",
                "CTREncrypt",
                {
                    templateParams: ["256", "2"],
                }
            );

            const plaintext = new Array(32).fill(0x77) as Byte[];

            const key = [
                { bytes: [0x00, 0x11, 0x22, 0x33] },
                { bytes: [0x44, 0x55, 0x66, 0x77] },
                { bytes: [0x88, 0x99, 0xaa, 0xbb] },
                { bytes: [0xcc, 0xdd, 0xee, 0xff] },
                { bytes: [0xff, 0xee, 0xdd, 0xcc] },
                { bytes: [0xbb, 0xaa, 0x99, 0x88] },
                { bytes: [0x77, 0x66, 0x55, 0x44] },
                { bytes: [0x33, 0x22, 0x11, 0x00] },
            ] as Word[];

            const j0 = [
                0xf0, 0xe1, 0xd2, 0xc3, 0xb4, 0xa5, 0x96, 0x87,
                0x78, 0x69, 0x5a, 0x4b, 0x00, 0x00, 0x00, 0x10,
            ] as Byte16;

            const numBlocks = 2;

            await circuit256.expectPass({ plaintext, key, j0, numBlocks }, { ciphertext: ctrEncrypt(plaintext, key, j0, numBlocks) });
        });
    });
});