import { PATHS_CONFIG, CRYPTO_CONFIG } from '@shared/config.js';
import { getDecryptionKey, aes256gcmDecrypt, chacha20Decrypt } from '@shared/utils/crypto';
import { AES_256_GCM, CHACHA20_POLY1305 } from '@shared/constants/crypto';
import { createHelia, Helia } from 'helia';
import { json, JSON as HeliaJSON } from '@helia/json';
import { CID } from 'multiformats/cid';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import chalk from 'chalk';

const modulePath = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(modulePath, '../.env') });

interface EnvironmentVariables {
    ALGORITHM: string;
    CID?: string;
}

interface EncryptedData {
    ciphertext: string;
    iv: string;
    authTag: string;
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
    const { ALGORITHM, CID } = process.env;

    if (!ALGORITHM) {
        throw new Error('Environment variable ALGORITHM is not set');
    }

    if (!CRYPTO_CONFIG.supportedAlgorithms.includes(ALGORITHM)) {
        throw new Error(`Unsupported encryption algorithm: ${ALGORITHM}. Supported algorithms: ${CRYPTO_CONFIG.supportedAlgorithms.join(', ')}`);
    }

    return { ALGORITHM, CID };
}

/**
 * Decrypt JSON data
 */
function decryptTestament(encryptedData: EncryptedData): string {
    try {
        const { ALGORITHM } = validateEnvironment();

        // Convert data format
        const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
        const key = Buffer.from(getDecryptionKey(), 'base64');
        const iv = Buffer.from(encryptedData.iv, 'base64');
        const authTag = Buffer.from(encryptedData.authTag, 'base64');

        console.log(chalk.blue(`Decrypting with ${ALGORITHM} algorithm...`));

        let plaintext;
        switch (ALGORITHM) {
            case AES_256_GCM:
                plaintext = aes256gcmDecrypt(ciphertext, key, iv, authTag);
                break;
            case CHACHA20_POLY1305:
                plaintext = chacha20Decrypt(ciphertext, key, iv, authTag);
                break;
            default:
                throw new Error(`Unsupported encryption algorithm: ${ALGORITHM}`);
        }

        // Save decrypted result
        writeFileSync(PATHS_CONFIG.testament.decrypted, plaintext);
        console.log(chalk.green('Testament successfully decrypted and saved to:'), PATHS_CONFIG.testament.decrypted);

        return plaintext;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Error occurred during decryption:'), errorMessage);
        throw error;
    }
}

/**
 * Read from local file and decrypt
 */
async function decryptFromLocalFile(): Promise<string> {
    try {
        if (!existsSync(PATHS_CONFIG.testament.encrypted)) {
            throw new Error(`Encrypted file does not exist: ${PATHS_CONFIG.testament.encrypted}`);
        }

        console.log(chalk.blue('Reading encrypted data from local file...'));
        const encryptedContent = readFileSync(PATHS_CONFIG.testament.encrypted, 'utf8');
        const encryptedData = JSON.parse(encryptedContent);

        return decryptTestament(encryptedData);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Failed to decrypt from local file:'), errorMessage);
        throw error;
    }
}

/**
 * Download from IPFS and decrypt
 */
async function decryptFromIPFS(): Promise<string> {
    let helia: Helia | undefined;

    try {
        const { CID: cidString } = validateEnvironment();

        if (!cidString) {
            throw new Error('Environment variable CID is not set');
        }

        // Create Helia instance
        helia = await createHelia();
        const j: HeliaJSON = json(helia);

        const cid = CID.parse(cidString);
        console.log(chalk.blue('CID:'), cid.toString());
        console.log(chalk.blue('Downloading encrypted data from IPFS...'));

        const encryptedData: EncryptedData = await j.get(cid);
        return decryptTestament(encryptedData);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Failed to decrypt from IPFS:'), errorMessage);
        throw error;
    } finally {
        // Clean up resources
        if (helia) {
            try {
                await helia.stop();
                console.log(chalk.gray('Helia instance stopped'));
            } catch (stopError) {
                const stopErrorMessage = stopError instanceof Error ? stopError.message : 'Unknown error';
                console.warn(chalk.yellow('Warning occurred while stopping Helia instance:'), stopErrorMessage);
            }
        }
    }
}

/**
 * Main function - decide which method to use based on environment
 */
async function main(): Promise<void> {
    try {
        const isTestMode = process.argv.includes('--test');

        if (isTestMode) {
            console.log(chalk.cyan('\n=== Test Mode: Decrypt from file ===\n'));
            await decryptFromLocalFile();
        } else {
            console.log(chalk.cyan('\n=== Production Mode: Decrypt from IPFS ===\n'));
            await decryptFromIPFS();
        }

        console.log(chalk.green.bold('✅ Decryption completed!'));
        console.log(chalk.gray('Closing the process...'));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red.bold('❌ Program execution failed:'), errorMessage);
        process.exit(1);
    }
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    // Only run when executed directly
    main().catch((error: Error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red.bold('Uncaught error:'), errorMessage);
        process.exit(1);
    });
}