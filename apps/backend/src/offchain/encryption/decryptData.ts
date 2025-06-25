import { PATHS_CONFIG, CRYPTO_CONFIG } from "@shared/config";
import { AES_256_GCM, CHACHA20_POLY1305 } from "@shared/constants/crypto";
import { EncryptedData } from "@shared/types";
import {
    getDecryptionKey,
    aes256gcmDecrypt,
    chacha20Decrypt,
} from "@shared/utils/crypto";
import { validateBase64 } from "@shared/utils/format";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import chalk from "chalk";

const modulePath = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(modulePath, "../.env") });

interface ProcessResult {
    decryptedPath: string;
    algorithm: string;
    success: boolean;
}

/**
 * Validate file existence
 */
function validateFiles(filePath: string): void {
    if (!existsSync(filePath)) {
        throw new Error(
            `The file to be decrpyted does not exist: ${filePath}`
        );
    }
}

function readEncryptedData(filePath: string): EncryptedData {
    try {
        console.log(chalk.blue("Reading encrypted will data..."));
        const encryptedContent = readFileSync(filePath, "utf8");
        const encryptedJson: EncryptedData = JSON.parse(encryptedContent);

        // Validate required fields
        const requiredFields: (keyof EncryptedData)[] = ["algorithm", "iv", "authTag", "ciphertext", "timestamp"];
        for (const field of requiredFields) {
            if (!encryptedJson[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate algorithm
        if (!CRYPTO_CONFIG.supportedAlgorithms.includes(encryptedJson.algorithm)) {
            throw new Error(
                `Unsupported encryption algorithm: ${encryptedJson.algorithm}. Supported algorithms: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`
            );
        }

        // Validate Base64 strings
        const base64Fields: (keyof Pick<EncryptedData, "iv" | "authTag" | "ciphertext">)[] = ["iv", "authTag", "ciphertext"];
        for (const field of base64Fields) {
            if (!validateBase64(encryptedJson[field])) {
                throw new Error(`Invalid Base64 format for field: ${field}`);
            }
        }

        // Validate timestamp format (ISO 8601)
        const timestamp = new Date(encryptedJson.timestamp);
        if (isNaN(timestamp.getTime())) {
            throw new Error(`Invalid timestamp format: ${encryptedJson.timestamp}`);
        }

        // Validate minimum field lengths for security
        if (Buffer.from(encryptedJson.iv, 'base64').length < 12) {
            throw new Error("IV length is too short (minimum 12 bytes required)");
        }

        if (Buffer.from(encryptedJson.authTag, 'base64').length < 16) {
            throw new Error("AuthTag length is too short (minimum 16 bytes required)");
        }

        if (Buffer.from(encryptedJson.ciphertext, 'base64').length === 0) {
            throw new Error("Ciphertext cannot be empty");
        }

        console.log(chalk.green("✅ Encrypted data validated successfully"));

        return encryptedJson;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in encrypted file: ${error.message}`);
        }
        throw error;
    }
}
  
/**
 * Decrypt JSON data
 */
function decryptWill(encryptedData: EncryptedData): string {
    try {
        // Convert data format
        const ciphertext = Buffer.from(encryptedData.ciphertext, "base64");
        const key = getDecryptionKey();
        const iv = Buffer.from(encryptedData.iv, "base64");
        const authTag = Buffer.from(encryptedData.authTag, "base64");

        console.log(chalk.blue(`Decrypting with ${CRYPTO_CONFIG.algorithm} algorithm...`));

        let plaintext;
        switch (CRYPTO_CONFIG.algorithm) {
            case AES_256_GCM:
                plaintext = aes256gcmDecrypt(ciphertext, key, iv, authTag);
                break;
            case CHACHA20_POLY1305:
                plaintext = chacha20Decrypt(ciphertext, key, iv, authTag);
                break;
            default:
                throw new Error(`Unsupported encryption algorithm: ${CRYPTO_CONFIG.algorithm}`);
        }

        return plaintext;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        console.error(chalk.red("Error occurred during decryption:"), errorMessage);
        throw error;
    }
}

/**
 * Save encrypted data to file
 */
function saveDecryptedData(
    decryptedData: string
): void {
    try {
        writeFileSync(PATHS_CONFIG.will.decrypted, decryptedData);
        console.log(chalk.green("✅ Decrypted data saved to:"), PATHS_CONFIG.will.decrypted);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to save decrypted data: ${errorMessage}`);
    }
}

/**
 * Process will decryption
 */
async function processDataDecryption(isTestMode: boolean): Promise<ProcessResult> {
    try {
        const filePath = (isTestMode) ? PATHS_CONFIG.will.encrypted : PATHS_CONFIG.will.downloaded;

        // Validate prerequisites
        validateFiles(filePath);

        // Read and validate encrypted data
        const encryptedData = readEncryptedData(filePath);

        const dcryptedData = decryptWill(encryptedData);

        // Save decrypted data
        saveDecryptedData(dcryptedData);

        console.log(
            chalk.green.bold("\n🎉 Data decryption process completed successfully!")
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
            chalk.red("Error during data decryption process:"),
            errorMessage
        );
        throw error;
    }
}

/**
 * Main function - decide which method to use based on environment
 */
async function main(): Promise<void> {
    try {
        const isTestMode = process.argv.includes("--test");
        if (isTestMode) {
            console.log(chalk.cyan("\n=== Test Mode: Decrypt from Local File ===\n"));
        } else {
            console.log(chalk.cyan("\n=== Production Mode: Decrypt from IPFS File ===\n"));
        }

        const result = await processDataDecryption(isTestMode);

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