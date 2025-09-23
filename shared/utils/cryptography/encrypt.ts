import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import {
  AES_256_CTR,
  AES_256_GCM,
  CHACHA20_POLY1305,
} from "@shared/constants/cryptography.js";
import {
  Base64String,
  type SupportedAlgorithm,
  type EncryptionArgs,
} from "@shared/types/index.js";
import { generateInitializationVector } from "./initializationVector.js";
import { generateKey } from "./key.js";
import { createCipheriv, Cipheriv } from "crypto";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

interface AuthenticatedCipher extends Cipheriv {
  getAuthTag(): Buffer;
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
  const parsed: Partial<EncryptionArgs> = {
    algorithm: AES_256_CTR, // Default algorithm
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
      try {
        parsed.plaintext = Buffer.from(args[i + 1], "utf8");
      } catch (error) {
        throw new Error(
          `Invalid plainttext: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
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
  const missingParams: string[] = [];
  if (!parsed.plaintext) missingParams.push("--plaintext");
  if (!parsed.algorithm) missingParams.push("--algorithm");
  if (missingParams.length > 0) {
    throw new Error(
      `Missing required parameters: ${missingParams.join(", ")} must be specified`,
    );
  }

  // generate the missing key
  if (!parsed.key) {
    parsed.key = generateKey();
    console.log(chalk.blue("Generated new encryption key"));
  }

  // generate the missing iv
  if (!parsed.iv) {
    const expectedIVLength = [AES_256_GCM, CHACHA20_POLY1305].includes(
      parsed.algorithm!,
    )
      ? 12
      : 16;
    parsed.iv = generateInitializationVector(expectedIVLength);
    console.log(chalk.blue("Generated new initialization vector"));
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
  try {
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

    const expectedIVLength = [AES_256_GCM, CHACHA20_POLY1305].includes(
      algorithm,
    )
      ? 12
      : 16;
    if (iv.length !== expectedIVLength) {
      throw new Error(
        `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${iv.length} bytes`,
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Decryption failed: ${errorMessage}`);
  }
}

/**
 * Generic encryption function with comprehensive validation
 */
function encrypt(
  algorithm: SupportedAlgorithm,
  plaintext: Buffer,
  key: Buffer,
  iv: Buffer,
): { ciphertext: Buffer } | { ciphertext: Buffer; authTag: Buffer } {
  try {
    console.log(chalk.blue(`Encrypting with ${algorithm}...`));

    // Validate inputs
    validateEncryptionParams(algorithm, plaintext, key, iv);

    // Create cipher
    const cipher = createCipheriv(algorithm, key, iv) as AuthenticatedCipher;

    // Perform encryption
    let ciphertext = cipher.update(plaintext);
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    if (ciphertext.length === 0) {
      throw new Error("Encryption resulted in empty ciphertext");
    }

    console.log(chalk.green(`✅ Encrypted!`));

    if ([AES_256_GCM, CHACHA20_POLY1305].includes(algorithm)) {
      const authTag = cipher.getAuthTag();
      if (authTag.length === 0) {
        throw new Error("Encryption failed to generate auth tag");
      }
      return { ciphertext, authTag };
    } else {
      return { ciphertext };
    }
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
    console.log(chalk.blue("Performing encryption..."));
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
    if ("authTag" in result) {
      console.log(
        chalk.cyan("AuthTag(base64):"),
        chalk.white(Base64String.fromBuffer(result.authTag)),
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Encryption failed:"),
      error instanceof Error ? error.message : "Unknown error",
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
  main().catch((error) => {
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export { encrypt };
