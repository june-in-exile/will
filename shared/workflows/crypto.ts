import { BaseWorkflow } from "./base.js";
import { CRYPTO_CONFIG } from "@config";
import {
  generateEncryptionKey,
  generateInitializationVector,
} from "@shared/utils/crypto/encrypt.js";
import { SupportedAlgorithm } from "@shared/types/crypto.js";
import chalk from "chalk";

export abstract class CryptoWorkflow<TInput, TResult> extends BaseWorkflow<
  TInput,
  TResult
> {
  // Common encryption-related methods
  protected getEncryptionKey(size: number = CRYPTO_CONFIG.keySize): Buffer {
    try {
      console.log(chalk.blue("🔑 Generating new encryption key..."));

      if (size !== CRYPTO_CONFIG.keySize) {
        throw new Error(
          `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${size} bytes`,
        );
      }

      return generateEncryptionKey(size);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get encryption key: ${errorMessage}`);
    }
  }

  protected getInitializationVector(
    size: number = CRYPTO_CONFIG.ivSize,
  ): Buffer {
    try {
      console.log(chalk.blue("🎲 Generating new initialization vector..."));

      if (size !== CRYPTO_CONFIG.ivSize) {
        throw new Error(
          `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${size} bytes`,
        );
      }

      return generateInitializationVector(size);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get initialization vector: ${errorMessage}`);
    }
  }

  protected validateCryptoParams(
    algorithm: SupportedAlgorithm,
    key: Buffer,
    iv: Buffer,
  ): void {
    // Validate algorithm
    if (!CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm)) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    // Validate key length
    if (key.length !== CRYPTO_CONFIG.keySize) {
      throw new Error(
        `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${key.length} bytes`,
      );
    }

    // Validate IV length
    if (iv.length !== CRYPTO_CONFIG.ivSize) {
      throw new Error(
        `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${iv.length} bytes`,
      );
    }
  }
}

// Files that need encryption/decryption functionality
// apps/backend/src/offchain/cryptography/encryptWill.ts             // ✅ CryptoWorkflow
// apps/backend/src/offchain/cryptography/decryptWill.ts             // ✅ CryptoWorkflow
