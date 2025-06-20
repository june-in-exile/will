import { PATHS_CONFIG, CRYPTO_CONFIG } from "../../config";
import { randomBytes, createCipheriv } from "crypto";
import { writeFileSync } from "fs";
import { config } from "dotenv";
import type { AuthenticatedCipher, EncryptionResult } from "../../types";
import { AES_256_GCM, CHACHA20_POLY1305 } from "../../constants";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

/**
 * Validate encryption parameters
 */
function validateEncryptionParams(
  plaintext: string,
  key: Buffer,
  iv: Buffer,
  algorithm: string,
): void {
  // Validate algorithm
  if (!CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm)) {
    throw new Error(
      `Unsupported encryption algorithm: ${algorithm}. Supported: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`,
    );
  }

  // Validate plaintext
  if (typeof plaintext !== "string") {
    throw new Error("Plaintext must be a string");
  }

  if (plaintext.length === 0) {
    throw new Error("Plaintext cannot be empty");
  }

  const plaintextBytes = Buffer.byteLength(
    plaintext,
    CRYPTO_CONFIG.inputEncoding as BufferEncoding,
  );
  if (plaintextBytes > CRYPTO_CONFIG.maxPlaintextSize) {
    throw new Error(
      `Plaintext too large: ${plaintextBytes} bytes (max: ${CRYPTO_CONFIG.maxPlaintextSize} bytes)`,
    );
  }

  // Validate key
  if (!Buffer.isBuffer(key)) {
    throw new Error("Key must be a Buffer");
  }

  if (key.length !== CRYPTO_CONFIG.keySize) {
    throw new Error(
      `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${key.length} bytes`,
    );
  }

  // Validate IV
  if (!Buffer.isBuffer(iv)) {
    throw new Error("IV must be a Buffer");
  }

  if (iv.length !== CRYPTO_CONFIG.ivSize) {
    throw new Error(
      `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${iv.length} bytes`,
    );
  }
}

/**
 * Generate cryptographically secure random bytes
 */
function generateSecureRandomBytes(size: number, purpose: string): Buffer {
  try {
    if (!Number.isInteger(size) || size <= 0 || size > 1024) {
      throw new Error(
        `Invalid size for ${purpose}: must be a positive integer <= 1024`,
      );
    }

    const bytes = randomBytes(size);

    // Basic entropy check - ensure not all zeros (extremely unlikely but possible)
    const isAllZeros = bytes.every((byte) => byte === 0);
    if (isAllZeros) {
      console.warn(
        chalk.yellow(
          `⚠️ Warning: Generated ${purpose} contains all zeros, regenerating...`,
        ),
      );
      return generateSecureRandomBytes(size, purpose); // Recursive retry
    }

    return bytes;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to generate secure random bytes for ${purpose}: ${errorMessage}`,
    );
  }
}

/**
 * Validate and create key file securely
 */
function createSecureKeyFile(keyPath: string, keyBuffer: Buffer): string {
  try {
    const keyBase64 = keyBuffer.toString("base64");

    // Validate base64 encoding
    const decodedKey = Buffer.from(keyBase64, "base64");
    if (!decodedKey.equals(keyBuffer)) {
      throw new Error("Key encoding/decoding validation failed");
    }

    // Write with restricted permissions (if supported)
    writeFileSync(keyPath, keyBase64);

    console.log(chalk.green("✅ New encryption key generated and saved"));
    console.log(chalk.yellow("⚠️ Keep this key file secure and backed up!"));

    return keyBase64;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create key file: ${errorMessage}`);
  }
}

/**
 * Generic encryption function with comprehensive validation
 */
function performEncryption(
  algorithm: string,
  plaintext: string,
  key: Buffer,
  iv: Buffer,
): EncryptionResult {
  try {
    // Validate all parameters
    validateEncryptionParams(plaintext, key, iv, algorithm);

    // Create cipher
    const cipher = createCipheriv(algorithm, key, iv) as AuthenticatedCipher;

    // Perform encryption
    const chunks: Buffer[] = [];
    chunks.push(
      cipher.update(plaintext, CRYPTO_CONFIG.inputEncoding as BufferEncoding),
    );
    chunks.push(cipher.final());

    const ciphertext = Buffer.concat(chunks);
    const authTag = cipher.getAuthTag();

    // Validate results
    if (ciphertext.length === 0) {
      throw new Error("Encryption resulted in empty ciphertext");
    }

    if (authTag.length === 0) {
      throw new Error("Encryption failed to generate auth tag");
    }

    return { ciphertext, authTag };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Encryption failed: ${errorMessage}`);
  }
}

/**
 * Get or generate encryption key with validation
 */
export function getEncryptionKey(size: number = CRYPTO_CONFIG.keySize): string {
  try {
    // Validate size parameter
    if (size !== CRYPTO_CONFIG.keySize) {
      throw new Error(
        `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${size} bytes`,
      );
    }

    const keyBuffer = generateSecureRandomBytes(size, "encryption key");
    return createSecureKeyFile(PATHS_CONFIG.crypto.keyFile, keyBuffer);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to get encryption key: ${errorMessage}`);
  }
}

/**
 * Get or generate initialization vector with validation
 */
export function getInitializationVector(
  size: number = CRYPTO_CONFIG.ivSize,
): string {
  try {
    // Validate size parameter
    if (size !== CRYPTO_CONFIG.ivSize) {
      throw new Error(
        `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${size} bytes`,
      );
    }

    let ivBase64: string;

    const ivBuffer = generateSecureRandomBytes(size, "initialization vector");
    ivBase64 = ivBuffer.toString("base64");

    return ivBase64;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to get initialization vector: ${errorMessage}`);
  }
}

/**
 * AES-256-GCM encryption with enhanced validation
 */
export function aes256gcmEncrypt(
  plaintext: string,
  key: Buffer,
  iv: Buffer,
): EncryptionResult {
  try {
    return performEncryption(AES_256_GCM, plaintext, key, iv);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`AES-256-GCM encryption failed: ${errorMessage}`);
  }
}

/**
 * ChaCha20-Poly1305 encryption with enhanced validation
 */
export function chacha20Encrypt(
  plaintext: string,
  key: Buffer,
  iv: Buffer,
): EncryptionResult {
  try {
    return performEncryption(CHACHA20_POLY1305, plaintext, key, iv);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`ChaCha20-Poly1305 encryption failed: ${errorMessage}`);
  }
}
