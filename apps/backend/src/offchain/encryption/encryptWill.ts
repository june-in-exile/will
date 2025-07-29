import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import type {
  EncryptionArgs,
  EncryptedWill,
  SupportedAlgorithm,
} from "@shared/types/crypto.js";
import { Base64String } from "@shared/types/encoding.js";
import {
  generateEncryptionKey,
  generateInitializationVector,
  encrypt,
} from "@shared/utils/crypto/encrypt.js";
import {
  validateEthereumAddress,
  validateSignature,
} from "@shared/utils/format/wallet.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
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

interface SignedWill {
  testator: string;
  estates: Estate[];
  salt: number;
  will: string;
  timestamp: string;
  metadata: Metadata;
  signature: Signature;
}

interface Estate {
  beneficiary: string;
  token: string;
  amount: bigint;
}

interface Metadata {
  predictedAt: number;
  estatesCount: number;
}

interface Signature {
  nonce: number;
  deadline: number;
  signature: string;
}

/**
 * Validate file existence
 */
function validateFiles(): void {
  if (!existsSync(PATHS_CONFIG.will.signed)) {
    throw new Error(
      `Signed will file does not exist: ${PATHS_CONFIG.will.signed}`,
    );
  }
}

/**
 * Read and validate signed will
 */
function readSignedWill(): SignedWill {
  try {
    console.log(chalk.blue("Reading signed will..."));
    const willContent = readFileSync(PATHS_CONFIG.will.signed, "utf8");
    const willJson: SignedWill = JSON.parse(willContent);

    // Validate required fields
    const requiredFields: (keyof SignedWill)[] = [
      "testator",
      "estates",
      "salt",
      "will",
      "timestamp",
      "metadata",
      "signature",
    ];
    for (const field of requiredFields) {
      if (willJson[field] === undefined || willJson[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate testator address
    if (!validateEthereumAddress(willJson.testator)) {
      throw new Error(`Invalid testator address format: ${willJson.testator}`);
    }

    // Validate will address
    if (!validateEthereumAddress(willJson.will)) {
      throw new Error(`Invalid will address format: ${willJson.will}`);
    }

    // Validate salt is a positive number
    if (typeof willJson.salt !== "number" || willJson.salt <= 0) {
      throw new Error(`Invalid salt value: ${willJson.salt}`);
    }

    // Validate timestamp format (ISO 8601)
    const timestamp = new Date(willJson.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error(`Invalid timestamp format: ${willJson.timestamp}`);
    }

    // Validate timestamp is not in the future (with 1 minute tolerance)
    if (timestamp > new Date(Date.now() + 60000)) {
      throw new Error(
        `Timestamp cannot be in the future: ${willJson.timestamp}`,
      );
    }

    // Validate estates array
    if (!Array.isArray(willJson.estates) || willJson.estates.length === 0) {
      throw new Error("Estates array must be non-empty");
    }

    // Validate each estate
    willJson.estates.forEach((estate, index) => {
      const requiredEstateFields: (keyof Estate)[] = [
        "beneficiary",
        "token",
        "amount",
      ];

      for (const field of requiredEstateFields) {
        if (estate[field] === undefined || estate[field] === null) {
          throw new Error(
            `Missing required field '${field}' in estate ${index}`,
          );
        }
      }

      // Validate beneficiary address
      if (!validateEthereumAddress(estate.beneficiary)) {
        throw new Error(
          `Invalid beneficiary address in estate ${index}: ${estate.beneficiary}`,
        );
      }

      // Validate token address
      if (!validateEthereumAddress(estate.token)) {
        throw new Error(
          `Invalid token address in estate ${index}: ${estate.token}`,
        );
      }

      // Validate amount is a positive number
      if (typeof estate.amount !== "number" || estate.amount <= 0) {
        throw new Error(
          `Invalid amount in estate ${index}: ${estate.amount} (must be a positive number)`,
        );
      }

      // Validate amount is an integer (no decimals for token amounts)
      if (!Number.isInteger(estate.amount)) {
        throw new Error(
          `Amount must be an integer in estate ${index}: ${estate.amount}`,
        );
      }
    });

    // Validate metadata
    if (!willJson.metadata || typeof willJson.metadata !== "object") {
      throw new Error("Metadata must be an object");
    }

    const requiredMetadataFields: (keyof Metadata)[] = [
      "predictedAt",
      "estatesCount",
    ];
    for (const field of requiredMetadataFields) {
      if (typeof willJson.metadata[field] !== "number") {
        throw new Error(`Invalid metadata field '${field}': must be a number`);
      }
    }

    // Validate metadata consistency
    if (willJson.metadata.estatesCount !== willJson.estates.length) {
      throw new Error(
        `Metadata estates count (${willJson.metadata.estatesCount}) does not match actual estates count (${willJson.estates.length})`,
      );
    }

    // Validate predictedAt timestamp
    if (willJson.metadata.predictedAt <= 0) {
      throw new Error(
        `Invalid predictedAt timestamp: ${willJson.metadata.predictedAt}`,
      );
    }

    // Validate signature object
    if (!willJson.signature || typeof willJson.signature !== "object") {
      throw new Error("Signature must be an object");
    }

    const requiredSignatureFields: (keyof Signature)[] = [
      "nonce",
      "deadline",
      "signature",
    ];
    for (const field of requiredSignatureFields) {
      if (
        willJson.signature[field] === undefined ||
        willJson.signature[field] === null
      ) {
        throw new Error(`Missing required signature field: ${field}`);
      }
    }

    // Validate signature fields
    if (
      typeof willJson.signature.nonce !== "number" ||
      willJson.signature.nonce <= 0
    ) {
      throw new Error(`Invalid nonce: ${willJson.signature.nonce}`);
    }

    if (
      typeof willJson.signature.deadline !== "number" ||
      willJson.signature.deadline <= 0
    ) {
      throw new Error(`Invalid deadline: ${willJson.signature.deadline}`);
    }

    if (!validateSignature(willJson.signature.signature)) {
      throw new Error(
        `Invalid signature format: ${willJson.signature.signature}`,
      );
    }

    // Validate deadline is in the future
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (willJson.signature.deadline <= currentTimestamp) {
      throw new Error(
        `Signature deadline has expired: ${willJson.signature.deadline}`,
      );
    }

    console.log(chalk.green("✅ Signed will validated successfully"));

    return willJson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in signed will file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate encryption keys and IV
 */
function getEncryptionArgs(): EncryptionArgs {
  const algorithm = CRYPTO_CONFIG.algorithm;

  validateFiles();
  const signedWill = readSignedWill();
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
function saveEncryptedWill(encryptedWill: EncryptedWill): void {
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
    const encryptedWill: EncryptedWill = {
      algorithm: algorithm,
      iv: Base64String.fromBuffer(iv),
      authTag: Base64String.fromBuffer(authTag),
      ciphertext: Base64String.fromBuffer(ciphertext),
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
  validateFiles,
  readSignedWill,
  getEncryptionArgs,
  saveEncryptedWill,
  processWillEncryption
}
