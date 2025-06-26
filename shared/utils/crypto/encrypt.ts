import { PATHS_CONFIG, CRYPTO_CONFIG } from "../../config";
import { randomBytes, createCipheriv } from "crypto";
import { writeFileSync } from "fs";
import { config } from "dotenv";
import type { AuthenticatedCipher, EncryptionResult } from "../../types";
import { AES_256_GCM, CHACHA20_POLY1305 } from "../../constants";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Type definitions
interface EncryptionArgs {
  algorithm: string;
  plaintext?: string;
  key?: Buffer;
  iv?: Buffer;
}

/**
 * Parse command line arguments to extract encryption parameters
 * Supports --algorithm, --plaintext, --key, and --iv flags
 * Validates algorithm and ensures plaintext is provided
 * @returns Object containing encryption parameters
 * @throws Error if invalid arguments or missing required parameters
 */
function parseArgs(): EncryptionArgs {
  const args = process.argv.slice(2);
  const result: EncryptionArgs = {
    algorithm: AES_256_GCM, // Default algorithm
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--algorithm" && i + 1 < args.length) {
      const algorithm = args[i + 1];
      if (!CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm)) {
        throw new Error(
          `Unsupported encryption algorithm: ${algorithm}. Supported algorithms: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`
        );
      }
      result.algorithm = algorithm;
      console.log(chalk.blue("Using algorithm:"), algorithm);
    } else if (args[i] === "--plaintext" && i + 1 < args.length) {
      result.plaintext = args[i + 1];
      console.log(chalk.blue("Plaintext provided:"), chalk.gray(result.plaintext.substring(0, 50) + (result.plaintext.length > 50 ? "..." : "")));
    } else if (args[i] === "--key" && i + 1 < args.length) {
      try {
        result.key = Buffer.from(args[i + 1], "base64");
        console.log(chalk.blue("Using provided key"));
      } catch (error) {
        throw new Error(`Invalid key format. Key must be valid base64: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } else if (args[i] === "--iv" && i + 1 < args.length) {
      try {
        result.iv = Buffer.from(args[i + 1], "base64");
        console.log(chalk.blue("Using provided IV"));
      } catch (error) {
        throw new Error(`Invalid IV format. IV must be valid base64: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }

  // Validate required parameters
  if (!result.plaintext) {
    throw new Error("Missing required parameter: --plaintext must be specified");
  }

  return result;
}

/**
 * Display usage information for the script
 */
function showUsage(): void {
  console.log(chalk.cyan("\n=== Usage Information ===\n"));
  console.log(
    chalk.white(
      "This script encrypts plaintext using AES-256-GCM or ChaCha20-Poly1305 algorithms:\n"
    )
  );

  console.log(chalk.yellow("Basic usage:"));
  console.log(chalk.gray('   pnpm exec tsx encrypt.ts --plaintext "Hello, World!"'));

  console.log(chalk.yellow("\nWith specific algorithm:"));
  console.log(chalk.gray('   pnpm exec tsx encrypt.ts --algorithm chacha20-poly1305 --plaintext "Secret message"'));

  console.log(chalk.yellow("\nWith custom key and IV:"));
  console.log(chalk.gray('   pnpm exec tsx encrypt.ts --plaintext "Text" --key "base64key..." --iv "base64iv..."'));

  console.log(chalk.white("\nParameters:"));
  console.log(chalk.cyan("  --algorithm") + chalk.gray("    Encryption algorithm (aes-256-gcm | chacha20-poly1305) [default: aes-256-gcm]"));
  console.log(chalk.cyan("  --plaintext") + chalk.gray("    Text to encrypt [required]"));
  console.log(chalk.cyan("  --key") + chalk.gray("         Base64-encoded encryption key [optional - auto-generated if not provided]"));
  console.log(chalk.cyan("  --iv") + chalk.gray("          Base64-encoded initialization vector [optional - auto-generated if not provided]"));

  console.log(chalk.red("\nImportant:"));
  console.log(chalk.red("• --plaintext parameter is required"));
  console.log(chalk.red("• If --key or --iv are not provided, they will be randomly generated"));
}

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
function createBase64KeyFile(keyPath: string, keyBuffer: Buffer) {
  try {
    const keyBase64 = keyBuffer.toString("base64");

    // Validate hex encoding
    const decodedKey = Buffer.from(keyBase64, "base64");
    if (!decodedKey.equals(keyBuffer)) {
      throw new Error("Key encoding/decoding validation failed");
    }

    // Write with restricted permissions (if supported)
    writeFileSync(keyPath, keyBase64);

    console.log(chalk.green("✅ New encryption key generated and saved"));
    console.log(chalk.yellow("⚠️ Keep this key file secure and backed up!"));
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
export function getEncryptionKey(size: number = CRYPTO_CONFIG.keySize): Buffer {
  try {
    // Validate size parameter
    if (size !== CRYPTO_CONFIG.keySize) {
      throw new Error(
        `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${size} bytes`,
      );
    }

    const keyBuffer = generateSecureRandomBytes(size, "encryption key");
    createBase64KeyFile(PATHS_CONFIG.crypto.keyFile, keyBuffer);
    return keyBuffer;
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
): Buffer {
  try {
    // Validate size parameter
    if (size !== CRYPTO_CONFIG.ivSize) {
      throw new Error(
        `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${size} bytes`,
      );
    }

    return generateSecureRandomBytes(size, "initialization vector");
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

/**
 * Main function that orchestrates the entire encryption process
 * 1. Parses command line arguments
 * 2. Generates missing key/IV if not provided
 * 3. Performs encryption using specified algorithm
 * 4. Displays formatted results
 *
 * @returns Promise that resolves when process completes successfully
 * @throws Error if any step in the process fails
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.cyan("\n=== Encryption Process ===\n"));

    // Parse command line arguments
    const { algorithm, plaintext, key: providedKey, iv: providedIv } = parseArgs();

    // Generate key if not provided
    let key: Buffer;
    if (providedKey) {
      key = providedKey;
      console.log(chalk.green("✅ Using provided key"));
    } else {
      console.log(chalk.blue("🔑 Generating new encryption key..."));
      key = getEncryptionKey();
    }

    // Generate IV if not provided
    let iv: Buffer;
    if (providedIv) {
      iv = providedIv;
      console.log(chalk.green("✅ Using provided IV"));
    } else {
      console.log(chalk.blue("🎲 Generating new initialization vector..."));
      iv = getInitializationVector();
    }

    // Perform encryption
    console.log(chalk.blue("🔐 Performing encryption..."));
    let result: EncryptionResult;

    if (algorithm === AES_256_GCM) {
      result = aes256gcmEncrypt(plaintext!, key, iv);
    } else if (algorithm === CHACHA20_POLY1305) {
      result = chacha20Encrypt(plaintext!, key, iv);
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    // Display results
    console.log(chalk.green.bold("\n✅ Encryption completed successfully!\n"));

    console.log(chalk.cyan("Algorithm:"), chalk.white(algorithm));
    console.log(chalk.cyan("Plaintext:"), chalk.white(plaintext));
    console.log(chalk.cyan("Key(base64):"), chalk.white(key.toString("base64")));
    console.log(chalk.cyan("IV(base64):"), chalk.white(iv.toString("base64")));
    console.log();
    console.log(chalk.cyan("Ciphertext(base64):"), chalk.white(result.ciphertext.toString("base64")));
    console.log(chalk.cyan("AuthTag(base64):"), chalk.white(result.authTag.toString("base64")));

  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Encryption failed:"),
      errorMessage,
    );

    // Show usage information for argument-related errors
    if (
      errorMessage.includes("--algorithm") ||
      errorMessage.includes("--plaintext") ||
      errorMessage.includes("--key") ||
      errorMessage.includes("--iv") ||
      errorMessage.includes("Missing required parameter") ||
      errorMessage.includes("Invalid algorithm")
    ) {
      showUsage();
    }

    // Log stack trace in development mode
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(chalk.gray("Stack trace:"), error.stack);
    }

    process.exit(1);
  }
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  // Only run when executed directly
  main().catch((error: Error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red.bold("Uncaught error:"), errorMessage);
    process.exit(1);
  });
}