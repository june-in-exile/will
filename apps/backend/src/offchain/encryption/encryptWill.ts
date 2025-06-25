import { PATHS_CONFIG, CRYPTO_CONFIG } from "@shared/config";
import {
  getEncryptionKey,
  getInitializationVector,
  aes256gcmEncrypt,
  chacha20Encrypt,
} from "@shared/utils/crypto";
import { Base64String } from "@shared/types";
import { AES_256_GCM, CHACHA20_POLY1305 } from "@shared/constants";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import chalk from "chalk";

const modulePath = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(modulePath, "../.env") });

// Type definitions
interface EncryptionParams {
  key: Buffer;
  iv: Buffer;
}

interface EncryptionResult {
  ciphertext: Buffer;
  authTag: Buffer;
}

interface EncryptedWill {
  algorithm: string;
  iv: Base64String;
  authTag: Base64String;
  ciphertext: Base64String;
  timestamp: string;
}

interface ProcessResult {
  encryptedPath: string;
  algorithm: string;
  success: boolean;
}

/**
 * Validate file existence
 */
function validateFiles(): void {
  if (!existsSync(PATHS_CONFIG.will.signed)) {
    throw new Error(
      `Signed will file does not exist: ${PATHS_CONFIG.will.signed}`
    );
  }
}

/**
 * Generate encryption keys and IV
 */
function generateEncryptionParams(): EncryptionParams {
  console.log(chalk.blue("Generating encryption key..."));
  const key = getEncryptionKey(CRYPTO_CONFIG.keySize);

  console.log(chalk.blue("Generating initialization vector..."));
  const iv = getInitializationVector(CRYPTO_CONFIG.ivSize);

  return { key, iv };
}

/**
 * Encrypt will data
 */
function encryptWill(
  willData: string,
  algorithm: string,
  key: Buffer,
  iv: Buffer
): EncryptionResult {
  console.log(chalk.blue(`Encrypting with ${algorithm}...`));

  let ciphertext: Buffer, authTag: Buffer;

  switch (algorithm) {
    case AES_256_GCM:
      ({ ciphertext, authTag } = aes256gcmEncrypt(willData, key, iv));
      break;
    case CHACHA20_POLY1305:
      ({ ciphertext, authTag } = chacha20Encrypt(willData, key, iv));
      break;
    default:
      throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
  }

  return { ciphertext, authTag };
}

/**
 * Save encrypted data to file
 */
function saveEncryptedData(
  encryptedData: EncryptedWill
): void {
  try {
    writeFileSync(PATHS_CONFIG.will.encrypted, JSON.stringify(encryptedData, null, 4));
    console.log(chalk.green("Encrypted data saved to:"), PATHS_CONFIG.will.encrypted);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save encrypted data: ${errorMessage}`);
  }
}

/**
 * Process will encryption
 */
async function processWillEncryption(): Promise<ProcessResult> {
  try {
    // Validate files
    validateFiles();

    // Read will data
    console.log(chalk.blue("Reading signed will..."));
    const willData = readFileSync(PATHS_CONFIG.will.signed, "utf8");

    // Generate encryption parameters
    const { key, iv } = generateEncryptionParams();

    // Encrypt the will
    const { ciphertext, authTag } = encryptWill(willData, CRYPTO_CONFIG.algorithm, key, iv);

    // Prepare encrypted data structure
    const encryptedWill: EncryptedWill = {
      algorithm: CRYPTO_CONFIG.algorithm,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      timestamp: new Date().toISOString(),
    };

    console.log(chalk.gray("Encrypted will structure:"));
    console.log(
      JSON.stringify(
        {
          ...encryptedWill,
          ciphertext: encryptedWill.ciphertext.substring(0, 50) + "...",
        },
        null,
        2
      )
    );

    // Save encrypted data
    saveEncryptedData(encryptedWill);

    console.log(
      chalk.green.bold("\n🎉 Will encryption process completed successfully!")
    );

    return {
      encryptedPath: PATHS_CONFIG.will.encrypted,
      algorithm: CRYPTO_CONFIG.algorithm,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during will encryption process:"),
      errorMessage
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(
      chalk.cyan("\n=== Will Encryption ===\n")
    );

    const result = await processWillEncryption();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red.bold("❌ Program execution failed:"), errorMessage);

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
