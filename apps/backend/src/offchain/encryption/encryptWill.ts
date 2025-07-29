import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import type {
  EncryptionArgs,
  SupportedAlgorithm,
} from "@shared/types/crypto.js";
import {
  generateEncryptionKey,
  generateInitializationVector,
  encrypt,
} from "@shared/utils/crypto/encrypt.js";
import { Base64String } from "@shared/types/base64String.js";
import { WillFileType, SignedWillData, EncryptedWillData } from "@shared/types/will.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import chalk from "chalk";

const modulePath = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(modulePath, "../.env") });

// Type definitions
interface ProcessResult {
  encryptedPath: string;
  algorithm: SupportedAlgorithm;
  success: boolean;
}

/**
 * Generate encryption keys and IV
 */
function getEncryptionArgs(): EncryptionArgs {
  const algorithm = CRYPTO_CONFIG.algorithm;

  const signedWill: SignedWillData = readWill(WillFileType.SIGNED);
  const signedWillString = JSON.stringify(signedWill);
  const plaintext = Buffer.from(
    signedWillString,
    CRYPTO_CONFIG.plaintextEncoding,
  );

  const key = generateEncryptionKey(CRYPTO_CONFIG.keySize);

  const iv = generateInitializationVector(CRYPTO_CONFIG.ivSize);

  return { algorithm, plaintext, key, iv };
}

/**
 * Save encrypted will to file
 */
function saveEncryptedWill(encryptedWill: EncryptedWillData): void {
  try {
    writeFileSync(
      PATHS_CONFIG.will.encrypted,
      JSON.stringify(encryptedWill, null, 4),
    );
    console.log(
      chalk.green("Encrypted will saved to:"),
      PATHS_CONFIG.will.encrypted,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save encrypted will: ${errorMessage}`);
  }
}

/**
 * Process will encryption
 */
async function processWillEncryption(): Promise<ProcessResult> {
  try {
    // Get encryption parameters
    const { algorithm, plaintext: will, key, iv } = getEncryptionArgs();

    // Encrypt the will
    console.log(chalk.blue(`Encrypting with ${algorithm}...`));
    const { ciphertext, authTag } = encrypt(algorithm, will, key, iv);

    // Prepare encrypted will structure
    const encryptedWill: EncryptedWillData = {
      algorithm: algorithm,
      iv: Base64String.fromBuffer(iv),
      authTag: Base64String.fromBuffer(authTag),
      ciphertext: Base64String.fromBuffer(ciphertext),
      timestamp: Date.now(),
    };

    console.log(chalk.gray("Encrypted will structure:"));
    console.log(
      JSON.stringify(
        {
          ...encryptedWill,
          ciphertext: encryptedWill.ciphertext.substring(0, 50) + "...",
        },
        null,
        2,
      ),
    );

    // Save encrypted will
    saveEncryptedWill(encryptedWill);

    console.log(
      chalk.green.bold("\n🎉 Will encryption process completed successfully!"),
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
      errorMessage,
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.cyan("\n=== Will Encryption ===\n"));

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

export {
  getEncryptionArgs,
  saveEncryptedWill,
  processWillEncryption
}
