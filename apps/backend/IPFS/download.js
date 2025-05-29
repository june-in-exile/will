import { PATHS_CONFIG, CRYPTO_CONFIG } from '../config.js';
import { createHelia } from 'helia';
import { json } from '@helia/json';
import { CID } from 'multiformats/cid';
import { getDecryptionKey, aes256gcmDecrypt, chacha20Decrypt } from '../utils/crypto/decrypt.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import chalk from 'chalk';

const modulePath = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(modulePath, '../.env') });

/**
 * Validate environment variables
 */
function validateEnvironment() {
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
 * Validate encrypted data structure
 */
function validateEncryptedData(data) {
    const requiredFields = ['ciphertext', 'iv', 'authTag'];

    for (const field of requiredFields) {
        if (!data[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    return true;
}

/**
 * Decrypt JSON data
 */
function decryptTestament(encryptedData) {
    try {
        validateEncryptedData(encryptedData);

        const { ALGORITHM } = validateEnvironment();

        // Convert data format
        const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
        const key = Buffer.from(getDecryptionKey(), 'base64');
        const iv = Buffer.from(encryptedData.iv, 'base64');
        const authTag = Buffer.from(encryptedData.authTag, 'base64');

        console.log(chalk.blue(`Decrypting with ${ALGORITHM} algorithm...`));

        let plaintext;
        switch (ALGORITHM) {
            case 'aes-256-gcm':
                plaintext = aes256gcmDecrypt(ciphertext, key, iv, authTag);
                break;
            case 'chacha20':
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
        console.error(chalk.red('Error occurred during decryption:'), error.message);
        throw error;
    }
}

/**
 * Read from local file and decrypt
 */
async function decryptFromLocalFile() {
    try {
        if (!existsSync(PATHS_CONFIG.testament.encrypted)) {
            throw new Error(`Encrypted file does not exist: ${PATHS_CONFIG.testament.encrypted}`);
        }

        console.log(chalk.blue('Reading encrypted data from local file...'));
        const encryptedContent = readFileSync(PATHS_CONFIG.testament.encrypted, 'utf8');
        const encryptedData = JSON.parse(encryptedContent);

        return decryptTestament(encryptedData);

    } catch (error) {
        console.error(chalk.red('Failed to decrypt from local file:'), error.message);
        throw error;
    }
}

/**
 * Download from IPFS and decrypt
 */
async function decryptFromIPFS() {
    let helia;

    try {
        const { CID: cidString } = validateEnvironment();

        if (!cidString) {
            throw new Error('Environment variable CID is not set');
        }

        // Create Helia instance
        helia = await createHelia();
        const j = json(helia);

        const cid = CID.parse(cidString);
        console.log(chalk.blue('CID:'), cid.toString());
        console.log(chalk.blue('Downloading encrypted data from IPFS...'));

        const encryptedData = await j.get(cid);
        return decryptTestament(encryptedData);

    } catch (error) {
        console.error(chalk.red('Failed to decrypt from IPFS:'), error.message);
        throw error;
    } finally {
        // Clean up resources
        if (helia) {
            try {
                await helia.stop();
                console.log(chalk.gray('Helia instance stopped'));
            } catch (stopError) {
                console.warn(chalk.yellow('Warning occurred while stopping Helia instance:'), stopError.message);
            }
        }
    }
}

/**
 * Main function - decide which method to use based on environment
 */
async function main() {
    try {
        const isTestMode = process.argv.includes('--test');

        if (isTestMode) {
            console.log(chalk.cyan('=== Test Mode: Decrypt from file ==='));
            await decryptFromLocalFile();
        } else {
            console.log(chalk.cyan('=== Production Mode: Decrypt from IPFS ==='));
            await decryptFromIPFS();
        }

        console.log(chalk.green.bold('✅ Decryption completed!'));
        console.log(chalk.gray('Closing the process...'));

    } catch (error) {
        console.error(chalk.red.bold('❌ Program execution failed:'), error.message);
        process.exit(1);
    }
}

// Execute main function
main().catch(error => {
    console.error(chalk.red.bold('Uncaught error:'), error);
    process.exit(1);
});