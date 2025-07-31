import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import { type Base64String } from "@shared/types/base64String.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import chalk from "chalk";

function generateKey(
    size: number = CRYPTO_CONFIG.keySize,
): Buffer {
    try {
        console.log(chalk.blue("Generating new encryption key..."));

        if (size !== CRYPTO_CONFIG.keySize) {
            throw new Error(
                `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${size} bytes`,
            );
        }

        const keyBuffer = randomBytes(size);

        const keyBase64 = keyBuffer.toString("base64") as Base64String;

        writeFileSync(PATHS_CONFIG.crypto.keyFile, keyBase64);

        console.log(chalk.green("✅ New encryption key generated and saved"));
        console.log(chalk.yellow("⚠️ Keep this key file secure and backed up!"));

        return keyBuffer;
    } catch (error) {
        throw new Error(`Failed to generate encryption key: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

function getKey(keyPath: string = PATHS_CONFIG.crypto.keyFile): Buffer {
    if (!existsSync(keyPath)) {
        throw new Error(`Encryption key file not found: ${keyPath}`);
    }

    try {
        const keyContent = readFileSync(keyPath, "utf8").trim();

        if (!keyContent) {
            throw new Error("Key file is empty");
        }

        const keyBuffer = Buffer.from(keyContent, "base64");
        if (keyBuffer.length !== CRYPTO_CONFIG.keySize) {
            throw new Error(
                `Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${keyBuffer.length} bytes`,
            );
        }

        return keyBuffer;
    } catch (error) {
        throw new Error(`Failed to get key: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

export { generateKey, getKey };