import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import type {
  DecryptionArgs,
  EncryptedWill,
  SupportedAlgorithm,
} from "@shared/types/crypto.js";
import { Base64String } from "@shared/types/base64String.js";
import { getDecryptionKey, decrypt } from "@shared/utils/crypto/decrypt.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import chalk from "chalk";

const modulePath = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(modulePath, "../.env") });

interface ProcessResult {
  decryptedPath: string;
  algorithm: SupportedAlgorithm;
  success: boolean;
}

/**
 * Validate file existence
 */
function validateFiles(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`The file to be decrpyted does not exist: ${filePath}`);
  }
}

function readEncryptedWill(filePath: string): EncryptedWill {
  try {
    console.log(chalk.blue("Reading encrypted will..."));
    const encryptedContent = readFileSync(filePath, "utf8");
    const encryptedJson: EncryptedWill = JSON.parse(encryptedContent);

    // Validate required fields
    const requiredFields: (keyof EncryptedWill)[] = [
      "algorithm",
      "iv",
      "authTag",
      "ciphertext",
      "timestamp",
    ];
    for (const field of requiredFields) {
      if (!encryptedJson[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate algorithm
    if (!CRYPTO_CONFIG.supportedAlgorithms.includes(encryptedJson.algorithm)) {
      throw new Error(
        `Unsupported decryption algorithm: ${encryptedJson.algorithm}. Supported algorithms: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`,
      );
    }

    // Validate Base64 strings
    const base64Fields: (keyof Pick<
      EncryptedWill,
      "iv" | "authTag" | "ciphertext"
    >)[] = ["iv", "authTag", "ciphertext"];
    for (const field of base64Fields) {
      if (!Base64String.isValid(encryptedJson[field])) {
        throw new Error(`Invalid Base64 format for field: ${field}`);
      }
    }

    // Validate timestamp format (ISO 8601)
    const timestamp = new Date(encryptedJson.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error(`Invalid timestamp format: ${encryptedJson.timestamp}`);
    }

    // Validate minimum field lengths for security
    if (Buffer.from(encryptedJson.iv, "base64").length < 12) {
      throw new Error("IV length is too short (minimum 12 bytes required)");
    }

    if (Buffer.from(encryptedJson.authTag, "base64").length < 16) {
      throw new Error(
        "AuthTag length is too short (minimum 16 bytes required)",
      );
    }

    if (Buffer.from(encryptedJson.ciphertext, "base64").length === 0) {
      throw new Error("Ciphertext cannot be empty");
    }

    console.log(chalk.green("✅ Encrypted will validated successfully"));

    return encryptedJson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in encrypted file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get decryption arguments
 */
function getDecryptionArgs(filePath: string): DecryptionArgs {
  validateFiles(filePath);
  const encryptedWill = readEncryptedWill(filePath);

  const algorithm: SupportedAlgorithm = encryptedWill.algorithm;
  const ciphertext = Buffer.from(encryptedWill.ciphertext, "base64");
  const key = getDecryptionKey();
  const iv = Buffer.from(encryptedWill.iv, "base64");
  const authTag = Buffer.from(encryptedWill.authTag, "base64");

  return { algorithm, ciphertext, key, iv, authTag };
}

/**
 * Save decrypted will to file
 */
function saveDecryptedWill(decryptedWill: string): void {
  try {
    writeFileSync(PATHS_CONFIG.will.decrypted, decryptedWill);
    console.log(
      chalk.green("✅ Decrypted will saved to:"),
      PATHS_CONFIG.will.decrypted,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save decrypted will: ${errorMessage}`);
  }
}

/**
 * Process will decryption
 */
async function processWillDecryption(
  isTestMode: boolean,
): Promise<ProcessResult> {
  try {
    const filePath = isTestMode
      ? PATHS_CONFIG.will.encrypted
      : PATHS_CONFIG.will.downloaded;

    // Get decryption parameters
    const { algorithm, ciphertext, key, iv, authTag } =
      getDecryptionArgs(filePath);

    console.log(chalk.blue(`Decrypting with ${algorithm} algorithm...`));
    const dcryptedWillBuffer = decrypt(algorithm, ciphertext, key, iv, authTag);
    const dcryptedWill = dcryptedWillBuffer.toString(
      CRYPTO_CONFIG.plaintextEncoding,
    );

    console.log(chalk.gray("Decrypted will structure:"));
    console.log(dcryptedWill);

    // Save decrypted will
    saveDecryptedWill(dcryptedWill);

    console.log(
      chalk.green.bold("\n🎉 Will decryption process completed successfully!"),
    );

    return {
      decryptedPath: PATHS_CONFIG.will.decrypted,
      algorithm: CRYPTO_CONFIG.algorithm,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during will decryption process:"),
      errorMessage,
    );
    throw error;
  }
}

/**
 * Main function - decide which method to use based on environment
 */
async function main(): Promise<void> {
  try {
    const isTestMode = process.argv.includes("--local");
    if (isTestMode) {
      console.log(chalk.cyan("\n=== Test Mode: Decrypt from Local File ===\n"));
    } else {
      console.log(
        chalk.cyan("\n=== Production Mode: Decrypt from IPFS File ===\n"),
      );
    }

    const result = await processWillDecryption(isTestMode);

    console.log(chalk.green.bold("✅ Process completed successfully!"));
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

export {
  validateFiles,
  readEncryptedWill,
  getDecryptionArgs,
  saveDecryptedWill,
  processWillDecryption
}
