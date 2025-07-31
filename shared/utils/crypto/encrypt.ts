import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import { AES_256_GCM } from "@shared/types/constants.js";
import type {
  EncryptionArgs,
  AuthenticatedCipher,
  SupportedAlgorithm,
} from "@shared/types/crypto.js";
import { Base64String } from "@shared/types/base64String.js";
import { randomBytes, createCipheriv } from "crypto";
import { writeFileSync } from "fs";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

/**
 * Parse command line arguments to extract encryption parameters
 * Supports --algorithm, --plaintext, --key, and --iv flags
 * Validates algorithm and ensures plaintext is provided
 * @returns Object containing encryption parameters
 * @throws Error if invalid arguments or missing required parameters
 */
function parseArgs(): EncryptionArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<EncryptionArgs> = {
    algorithm: AES_256_GCM, // Default algorithm
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--algorithm" && i + 1 < args.length) {
      const algorithm = args[i + 1];
      if (!CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm)) {
        throw new Error(
          `Unsupported encryption algorithm: ${algorithm}. Supported algorithms: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`,
        );
      }
      parsed.algorithm = algorithm as SupportedAlgorithm;
      console.log(chalk.blue("Using algorithm:"), algorithm);
    } else if (args[i] === "--plaintext" && i + 1 < args.length) {
      const plaintext = args[i + 1];
      console.log(
        chalk.blue("Plaintext provided:"),
        chalk.gray(
          plaintext.substring(0, 50) + (plaintext.length > 50 ? "..." : ""),
        ),
      );
      parsed.plaintext = Buffer.from(
        plaintext,
        CRYPTO_CONFIG.plaintextEncoding,
      );
    } else if (args[i] === "--key" && i + 1 < args.length) {
      try {
        parsed.key = Buffer.from(args[i + 1], "base64");
        console.log(chalk.blue("Using provided key"));
      } catch (error) {
        throw new Error(
          `Invalid key format. Key must be valid base64: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else if (args[i] === "--iv" && i + 1 < args.length) {
      try {
        parsed.iv = Buffer.from(args[i + 1], "base64");
        console.log(chalk.blue("Using provided IV"));
      } catch (error) {
        throw new Error(
          `Invalid IV format. IV must be valid base64: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  }

  // Validate required parameters
  if (!parsed.plaintext) {
    throw new Error(
      "Missing required parameter: --plaintext must be specified",
    );
  }

  if (!parsed.algorithm || !parsed.plaintext) {
    throw new Error("Missing required parameters");
  }

  // generate the missing key
  if (!parsed.key) {
    parsed.key = generateEncryptionKey();
    console.log(chalk.blue("🔑 Generated new encryption key"));
  }

  // generate the missing iv
  if (!parsed.iv) {
    parsed.iv = generateInitializationVector();
    console.log(chalk.blue("🎲 Generated new initialization vector"));
  }

  return parsed as EncryptionArgs;
}

/**
 * Display usage information for the script
 */
function showUsage(): void {
  console.log(chalk.cyan("\n=== Usage Information ===\n"));
  console.log(
    chalk.white(
      "This script encrypts plaintext using AES-256-GCM or ChaCha20-Poly1305 algorithms:\n",
    ),
  );

  console.log(chalk.yellow("Basic usage:"));
  console.log(
    chalk.gray('   pnpm exec tsx encrypt.ts --plaintext "Hello, World!"'),
  );

  console.log(chalk.yellow("\nWith specific algorithm:"));
  console.log(
    chalk.gray(
      '   pnpm exec tsx encrypt.ts --algorithm chacha20-poly1305 --plaintext "Secret message"',
    ),
  );

  console.log(chalk.yellow("\nWith custom key and IV:"));
  console.log(
    chalk.gray(
      '   pnpm exec tsx encrypt.ts --plaintext "Text" --key "base64key..." --iv "base64iv..."',
    ),
  );

  console.log(chalk.white("\nParameters:"));
  console.log(
    chalk.cyan("  --algorithm") +
    chalk.gray(
      "    Encryption algorithm (aes-256-gcm | chacha20-poly1305) [default: aes-256-gcm]",
    ),
  );
  console.log(
    chalk.cyan("  --plaintext") + chalk.gray("    Text to encrypt [required]"),
  );
  console.log(
    chalk.cyan("  --key") +
    chalk.gray(
      "         Base64-encoded encryption key [optional - auto-generated if not provided]",
    ),
  );
  console.log(
    chalk.cyan("  --iv") +
    chalk.gray(
      "          Base64-encoded initialization vector [optional - auto-generated if not provided]",
    ),
  );

  console.log(chalk.red("\nImportant:"));
  console.log(chalk.red("• --plaintext parameter is required"));
  console.log(
    chalk.red(
      "• If --key or --iv are not provided, they will be randomly generated",
    ),
  );
}

/**
 * Validate encryption parameters
 */
function validateEncryptionParams(
  algorithm: SupportedAlgorithm,
  plaintext: Buffer,
  key: Buffer,
  iv: Buffer,
): void {
  // Validate algorithm
  if (!CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm)) {
    throw new Error(
      `Unsupported encryption algorithm: ${algorithm}. Supported: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`,
    );
  }

  // Validate plaintext
  if (!Buffer.isBuffer(plaintext)) {
    throw new Error("Plaintext must be a Buffer");
  }

  if (plaintext.length === 0) {
    throw new Error("Plaintext cannot be empty");
  }

  if (plaintext.length > CRYPTO_CONFIG.maxPlaintextSize) {
    throw new Error(
      `Plaintext too large: ${plaintext.length} bytes (max: ${CRYPTO_CONFIG.maxPlaintextSize} bytes)`,
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

    throw new Error(`Failed to create key file: ${errorMessage}`);
  }
}

/**
 * Generic encryption function with comprehensive validation
 */
export function encrypt(
  algorithm: SupportedAlgorithm,
  plaintext: Buffer,
  key: Buffer,
  iv: Buffer,
): { ciphertext: Buffer; authTag: Buffer } {
  try {
    // Validate inputs
    validateEncryptionParams(algorithm, plaintext, key, iv);

    // Create cipher
    const cipher = createCipheriv(algorithm, key, iv) as AuthenticatedCipher;

    // Perform encryption
    let ciphertext = cipher.update(plaintext);
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
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

    throw new Error(`Encryption failed: ${errorMessage}`);
  }
}

/**
 * Get or generate encryption key with validation
 */
export function generateEncryptionKey(
  size: number = CRYPTO_CONFIG.keySize,
): Buffer {
  try {
    console.log(chalk.blue("🔑 Generating new encryption key..."));

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

    throw new Error(`Failed to get encryption key: ${errorMessage}`);
  }
}

/**
 * Get or generate initialization vector with validation
 */
export function generateInitializationVector(
  size: number = CRYPTO_CONFIG.ivSize,
): Buffer {
  try {
    console.log(chalk.blue("🎲 Generating new initialization vector..."));

    // Validate size parameter
    if (size !== CRYPTO_CONFIG.ivSize) {
      throw new Error(
        `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${size} bytes`,
      );
    }

    return generateSecureRandomBytes(size, "initialization vector");
  } catch (error) {

    throw new Error(`Failed to get initialization vector: ${errorMessage}`);
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
    const { algorithm, plaintext, key, iv } = parseArgs();

    // Perform encryption
    console.log(chalk.blue("🔐 Performing encryption..."));
    const result = encrypt(algorithm, plaintext, key, iv);

    // Display results
    console.log(chalk.green.bold("\n✅ Encryption completed successfully!\n"));

    console.log(chalk.cyan("Algorithm:"), chalk.white(algorithm));
    console.log(chalk.cyan("Plaintext:"), chalk.white(plaintext));
    console.log(
      chalk.cyan("Key(base64):"),
      chalk.white(Base64String.fromBuffer(key)),
    );
    console.log(
      chalk.cyan("IV(base64):"),
      chalk.white(Base64String.fromBuffer(iv)),
    );
    console.log();
    console.log(
      chalk.cyan("Ciphertext(base64):"),
      chalk.white(Base64String.fromBuffer(result.ciphertext)),
    );
    console.log(
      chalk.cyan("AuthTag(base64):"),
      chalk.white(Base64String.fromBuffer(result.authTag)),
    );
  } catch (error) {

    console.error(chalk.red.bold("\n❌ Encryption failed:"), errorMessage);

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

    console.error(chalk.red.bold("Uncaught error:"), errorMessage);
    process.exit(1);
  });
}
