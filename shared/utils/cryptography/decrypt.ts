import { CRYPTO_CONFIG } from "@config";
import { AES_256_CTR, AES_256_GCM, CHACHA20_POLY1305 } from "@shared/constants/cryptography.js";
import type {
  DecryptionArgs,
  SupportedAlgorithm,
} from "@shared/types/crypto.js";
import { createDecipheriv, Decipheriv } from "crypto";
import chalk from "chalk";

interface AuthenticatedDecipher extends Decipheriv {
  setAuthTag(tag: Buffer): this;
}

/**
 * Parse command line arguments to extract decryption parameters
 * Supports --algorithm, --ciphertext, --key, --iv, and --authTag flags
 * Validates algorithm and ensures all required parameters are provided
 * @returns Object containing decryption parameters
 * @throws Error if invalid arguments or missing required parameters
 */
function parseArgs(): DecryptionArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<DecryptionArgs> = {
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
      parsed.algorithm = algorithm;
      console.log(chalk.blue("Using algorithm:"), algorithm);
    } else if (args[i] === "--ciphertext" && i + 1 < args.length) {
      try {
        parsed.ciphertext = Buffer.from(args[i + 1], "base64");
        console.log(
          chalk.blue("Ciphertext provided:"),
          chalk.gray(`${parsed.ciphertext.length} bytes`),
        );
      } catch (error) {
        throw new Error(
          `Invalid ciphertext format. Ciphertext must be valid base64: ${error instanceof Error ? error.message : "Unknown error"}`,
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
    } else if (args[i] === "--authTag" && i + 1 < args.length) {
      try {
        parsed.authTag = Buffer.from(args[i + 1], "base64");
        console.log(chalk.blue("Using provided auth tag"));
      } catch (error) {
        throw new Error(
          `Invalid auth tag format. Auth tag must be valid base64: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  }

  // Validate required parameters
  const missingParams: string[] = [];
  if (!parsed.ciphertext) missingParams.push("--ciphertext");
  if (!parsed.key) missingParams.push("--key");
  if (!parsed.iv) missingParams.push("--iv");
  if ([AES_256_GCM, CHACHA20_POLY1305].includes(parsed.algorithm!) && !parsed.authTag) missingParams.push("--authTag");

  if (missingParams.length > 0) {
    throw new Error(
      `Missing required parameters: ${missingParams.join(", ")} must be specified`,
    );
  }

  return parsed as DecryptionArgs;
}

/**
 * Display usage information for the script
 */
function showUsage(): void {
  console.log(chalk.cyan("\n=== Usage Information ===\n"));
  console.log(
    chalk.white(
      "This script decrypts ciphertext using AES-256-GCM or ChaCha20-Poly1305 algorithms:\n",
    ),
  );

  console.log(chalk.yellow("Basic usage:"));
  console.log(
    chalk.gray(
      '   pnpm exec tsx decrypt.ts --ciphertext "base64..." --key "base64..." --iv "base64..." --authTag "base64..."',
    ),
  );

  console.log(chalk.yellow("\nWith specific algorithm:"));
  console.log(
    chalk.gray(
      '   pnpm exec tsx decrypt.ts --algorithm chacha20-poly1305 --ciphertext "..." --key "..." --iv "..." --authTag "..."',
    ),
  );

  console.log(chalk.white("\nParameters:"));
  console.log(
    chalk.cyan("  --algorithm") +
    chalk.gray(
      "     Decryption algorithm (aes-256-gcm | chacha20-poly1305) [default: aes-256-gcm]",
    ),
  );
  console.log(
    chalk.cyan("  --ciphertext") +
    chalk.gray("    Base64-encoded ciphertext to decrypt [required]"),
  );
  console.log(
    chalk.cyan("  --key") +
    chalk.gray("          Base64-encoded decryption key [required]"),
  );
  console.log(
    chalk.cyan("  --iv") +
    chalk.gray("           Base64-encoded initialization vector [required]"),
  );
  console.log(
    chalk.cyan("  --authTag") +
    chalk.gray("      Base64-encoded authentication tag [required]"),
  );

  console.log(chalk.red("\nImportant:"));
  console.log(
    chalk.red(
      "• All parameters (--ciphertext, --key, --iv, --authTag) are required",
    ),
  );
  console.log(
    chalk.red("• All input values must be valid base64-encoded strings"),
  );
  console.log(
    chalk.red("• The algorithm must match the one used for encryption"),
  );
}

/**
 * Validate decryption parameters
 */
function validateDecryptionParams(
  algorithm: SupportedAlgorithm,
  ciphertext: Buffer,
  key: Buffer,
  iv: Buffer,
  authTag?: Buffer,
): void {
  try {
    // Validate algorithm
    if (!CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm)) {
      throw new Error(
        `Unsupported decryption algorithm: ${algorithm}. Supported: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`,
      );
    }

    // Validate ciphertext
    if (!Buffer.isBuffer(ciphertext)) {
      throw new Error("Ciphertext must be a Buffer");
    }

    if (ciphertext.length === 0) {
      throw new Error("Ciphertext cannot be empty");
    }

    if (ciphertext.length > CRYPTO_CONFIG.maxPlaintextSize) {
      throw new Error(
        `Ciphertext too large: ${ciphertext.length} bytes (max: ${CRYPTO_CONFIG.maxPlaintextSize} bytes)`,
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

    const expectedIVLength = [AES_256_GCM, CHACHA20_POLY1305].includes(algorithm) ? 12 : 16;
    if (iv.length !== expectedIVLength) {
      throw new Error(
        `Invalid IV size: expected ${CRYPTO_CONFIG.ivSize} bytes, got ${iv.length} bytes`,
      );
    }

    // Validate auth tag
    if ([AES_256_GCM, CHACHA20_POLY1305].includes(algorithm)) {
      if (!authTag || !Buffer.isBuffer(authTag)) {
        throw new Error("Auth tag must be a Buffer for authenticated algorithms");
      }
      const expectedAuthTagSize = 16; // 128 bits for GCM/Poly1305
      if (authTag.length !== expectedAuthTagSize) {
        throw new Error(
          `Invalid auth tag size: expected ${expectedAuthTagSize} bytes, got ${authTag.length} bytes`,
        );
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Decryption failed: ${errorMessage}`);
  }
}

/**
 * Generic decryption function with comprehensive validation
 */
function decrypt(
  algorithm: SupportedAlgorithm,
  ciphertext: Buffer,
  key: Buffer,
  iv: Buffer,
  authTag?: Buffer,
): Buffer {
  try {
    console.log(chalk.blue(`Decrypting with ${algorithm}...`));

    // Validate all parameters
    validateDecryptionParams(algorithm, ciphertext, key, iv, authTag);

    // Create decipher
    const decipher = createDecipheriv(
      algorithm,
      key,
      iv,
    ) as AuthenticatedDecipher;

    // Perform decryption
    if ([AES_256_GCM, CHACHA20_POLY1305].includes(algorithm) && authTag) {
      decipher.setAuthTag(authTag);
    }
    let plaintext = decipher.update(ciphertext);
    console.debug("Start concat");
    plaintext = Buffer.concat([plaintext, decipher.final()]);
    console.debug("End concat");

    // Validate result
    if (plaintext.length === 0) {
      throw new Error("Decryption resulted in empty plaintext");
    }

    console.log(chalk.green(`✅ Decrypted!`));
    return plaintext;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Decryption failed: ${errorMessage}`);
  }
}

/**
 * Main function that orchestrates the entire decryption process
 * 1. Parses command line arguments
 * 2. Validates all required parameters
 * 3. Performs decryption using specified algorithm
 * 4. Displays formatted results
 *
 * @returns Promise that resolves when process completes successfully
 * @throws Error if any step in the process fails
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.cyan("\n=== Decryption Process ===\n"));

    // Parse command line arguments
    const { algorithm, ciphertext, key, iv, authTag } = parseArgs();

    // Perform decryption
    console.log(chalk.blue("Performing decryption..."));
    const plaintextBuffer = decrypt(algorithm, ciphertext, key, iv, authTag);
    const plaintext = plaintextBuffer.toString("utf8");

    // Display results
    console.log(chalk.green.bold("\n✅ Decryption completed successfully!\n"));

    console.log(chalk.cyan("Algorithm:"), chalk.white(algorithm));
    console.log(
      chalk.cyan("Ciphertext(base64):"),
      chalk.white(ciphertext.toString("base64")),
    );
    console.log(
      chalk.cyan("Key(base64):"),
      chalk.white(key.toString("base64")),
    );
    console.log(chalk.cyan("IV(base64):"), chalk.white(iv.toString("base64")));
    if (authTag) {
      console.log(
        chalk.cyan("AuthTag(base64):"),
        chalk.white(authTag.toString("base64")),
      );
    }
    console.log();
    console.log(chalk.cyan("Plaintext:"), chalk.white(plaintext));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red.bold("\n❌ Decryption failed:"), errorMessage);

    // Show usage information for argument-related errors
    if (
      errorMessage.includes("--algorithm") ||
      errorMessage.includes("--ciphertext") ||
      errorMessage.includes("--key") ||
      errorMessage.includes("--iv") ||
      errorMessage.includes("--authTag") ||
      errorMessage.includes("Missing required parameters") ||
      errorMessage.includes("Invalid algorithm") ||
      errorMessage.includes("must be specified")
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
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export { decrypt };
