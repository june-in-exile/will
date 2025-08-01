import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import type {
  SupportedAlgorithm,
  DecryptionArgs,
  WillType,
  EncryptedWill,
  DownloadedWill,
  DecryptedWill,
} from "@shared/types/index.js";
import { WILL_TYPE } from "@shared/constants/will.js";
import { getKey, decrypt } from "@shared/utils/cryptography/index.js";
import { readWill, saveWill } from "@shared/utils/file/index.js";
import { validateWill } from "@shared/utils/validation/will.js";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";

interface ProcessResult extends DecryptedWill {
  decryptedWillPath: string;
}

/**
 * Get decryption arguments
 */
function getDecryptionArgs(type: WillType): DecryptionArgs {
  const encryptedWill: EncryptedWill | DownloadedWill = readWill(type);

  const algorithm: SupportedAlgorithm = encryptedWill.algorithm;
  const ciphertext = Buffer.from(encryptedWill.ciphertext, "base64");
  const key = getKey();
  const iv = Buffer.from(encryptedWill.iv, "base64");
  const authTag = Buffer.from(encryptedWill.authTag, "base64");

  return { algorithm, ciphertext, key, iv, authTag };
}

/**
 * Process will decryption
 */
async function processWillDecryption(
  isTestMode: boolean,
): Promise<ProcessResult> {
  try {
    const type: WillType = isTestMode
      ? WILL_TYPE.ENCRYPTED
      : WILL_TYPE.DOWNLOADED;

    const { algorithm, ciphertext, key, iv, authTag } = getDecryptionArgs(type);

    const dcryptedWillBuffer = decrypt(algorithm, ciphertext, key, iv, authTag);
    const decryptedWill: DecryptedWill = JSON.parse(
      dcryptedWillBuffer.toString(CRYPTO_CONFIG.plaintextEncoding),
    );

    validateWill(WILL_TYPE.DECRYPTED, decryptedWill);

    saveWill(WILL_TYPE.DECRYPTED, decryptedWill);

    console.log(
      chalk.green.bold("\n🎉 Will decryption process completed successfully!"),
    );

    return {
      ...decryptedWill,
      decryptedWillPath: PATHS_CONFIG.will.decrypted,
    };
  } catch (error) {
    console.error(
      chalk.red("Error during will decryption process:"),
      error instanceof Error ? error.message : "Unknown error",
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
      console.log(chalk.bgCyan("\n=== Will Decrypt (Local Version) ===\n"));
    } else {
      console.log(chalk.bgCyan("\n=== Will Decrypt (IPFS Version) ===\n"));
    }

    const result = await processWillDecryption(isTestMode);

    console.log(chalk.green.bold("✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      permit2: {
        nonce: result.permit2.nonce,
        deadline: `${preview.timestamp(result.permit2.deadline * 1000)}`,
        signature: `${preview.longString(result.permit2.signature)}`,
      },
    });
  } catch (error) {
    console.error(
      chalk.red.bold("❌ Program execution failed:"),
      error instanceof Error ? error.message : "Unknown error",
    );
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

export { processWillDecryption };
