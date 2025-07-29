import { BaseWorkflow } from "./base.js";
import { CRYPTO_CONFIG } from "@config";
import { generateEncryptionKey, generateInitializationVector } from "@shared/utils/crypto/encrypt.js"
import { SupportedAlgorithm } from "@shared/types/crypto.js"
import chalk from "chalk";

export abstract class CryptoWorkflow<TInput, TResult> extends BaseWorkflow<TInput, TResult> {
    // 加密相關的共用方法
    protected getEncryptionKey(size: number = CRYPTO_CONFIG.keySize): Buffer {
        try {
            console.log(chalk.blue("🔑 Generating new encryption key..."));

            if (size !== CRYPTO_CONFIG.keySize) {
                throw new Error(
                    `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${size} bytes`
                );
            }

            return generateEncryptionKey(size);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Failed to get encryption key: ${errorMessage}`);
        }
    }

    protected getInitializationVector(size: number = CRYPTO_CONFIG.ivSize): Buffer {
        try {
            console.log(chalk.blue("🎲 Generating new initialization vector..."));

            if (size !== CRYPTO_CONFIG.ivSize) {
                throw new Error(
                    `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${size} bytes`
                );
            }

            return generateInitializationVector(size);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Failed to get initialization vector: ${errorMessage}`);
        }
    }

    protected validateCryptoParams(
        algorithm: SupportedAlgorithm,
        key: Buffer,
        iv: Buffer
    ): void {
        // 驗證演算法
        if (!CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm)) {
            throw new Error(`Unsupported algorithm: ${algorithm}`);
        }

        // 驗證金鑰長度
        if (key.length !== CRYPTO_CONFIG.keySize) {
            throw new Error(
                `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${key.length} bytes`
            );
        }

        // 驗證 IV 長度
        if (iv.length !== CRYPTO_CONFIG.ivSize) {
            throw new Error(
                `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${iv.length} bytes`
            );
        }
    }
}


// // 需要加密/解密功能的檔案
// apps/backend/src/offchain/encryption/encryptWill.ts             // ✅ CryptoWorkflow
// apps/backend/src/offchain/encryption/decryptWill.ts             // ✅ CryptoWorkflow