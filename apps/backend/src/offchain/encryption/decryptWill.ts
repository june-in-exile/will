import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import type {
  DecryptionArgs,
  SupportedAlgorithm,
} from "@shared/types/crypto.js";
import { DownloadedWillData, WillFileType, type EncryptedWillData } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { saveDecryptedWill } from "@shared/utils/file/saveWill.js";
import { getDecryptionKey, decrypt } from "@shared/utils/crypto/decrypt.js";
import chalk from "chalk";

interface ProcessResult {
  decryptedPath: string;
  algorithm: SupportedAlgorithm;
  success: boolean;
}

/**
 * Get decryption arguments
 */
function getDecryptionArgs(type: WillFileType): DecryptionArgs {
  const encryptedWill: EncryptedWillData | DownloadedWillData = readWill(type);

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

/**
 * Process will decryption
 */
async function processWillDecryption(
  isTestMode: boolean,
): Promise<ProcessResult> {
  try {
    const type: WillFileType = isTestMode
      ? WillFileType.ENCRYPTED
      : WillFileType.DOWNLOADED;

    // Get decryption parameters
    const { algorithm, ciphertext, key, iv, authTag } =
      getDecryptionArgs(type);

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
  getDecryptionArgs,
  processWillDecryption
}
