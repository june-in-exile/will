import { BaseWorkflow } from "./base.js";
import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import { type Base64String } from "@shared/types/base64String.js";
import { SupportedAlgorithm } from "@shared/types/crypto.js";
import { generateKey } from "@shared/utils/cryptography/key.js";
import { generateInitializationVector } from "@shared/utils/cryptography/initializationVector.js";
import { writeFileSync } from "fs";
import { randomBytes } from "crypto";
import chalk from "chalk";

export abstract class CryptoWorkflow<TInput, TResult> extends BaseWorkflow<
  TInput,
  TResult
> {
  // Common encryption-related methods
  protected generateKey(size: number = CRYPTO_CONFIG.keySize): Buffer {
    return generateKey();
  };

  protected getInitializationVector(
    size: number = CRYPTO_CONFIG.ivSize,
  ): Buffer {
    return generateInitializationVector(size);
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
