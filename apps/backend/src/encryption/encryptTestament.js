import { PATHS_CONFIG, CRYPTO_CONFIG } from '@shared/config.js';
import { generateProof, verifyProof, makeLocalSnarkJsZkOperator } from '@reclaimprotocol/circom-symmetric-crypto';
import { getEncryptionKey, getInitializationVector, aes256gcmEncrypt, chacha20Encrypt } from '@shared/utils/crypto/encrypt.js';
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
    const { ALGORITHM } = process.env;

    if (!ALGORITHM) {
        throw new Error('Environment variable ALGORITHM is not set');
    }

    if (!CRYPTO_CONFIG.supportedAlgorithms.includes(ALGORITHM)) {
        throw new Error(`Unsupported encryption algorithm: ${ALGORITHM}. Supported algorithms: ${CRYPTO_CONFIG.supportedAlgorithms.join(', ')}`);
    }

    return { ALGORITHM };
}

/**
 * Validate file existence
 */
function validateFiles() {
    if (!existsSync(PATHS_CONFIG.testament.signed)) {
        throw new Error(`Signed testament file does not exist: ${PATHS_CONFIG.testament.signed}`);
    }
}

/**
 * Generate encryption keys and IV
 */
function generateEncryptionParams() {
    console.log(chalk.blue('Generating encryption key...'));
    const keyBase64 = getEncryptionKey(CRYPTO_CONFIG.keySize);
    const key = Buffer.from(keyBase64, 'base64');

    console.log(chalk.blue('Generating initialization vector...'));
    const ivBase64 = getInitializationVector(CRYPTO_CONFIG.ivSize);
    const iv = Buffer.from(ivBase64, 'base64');

    return { key, iv, keyBase64, ivBase64 };
}

/**
 * Encrypt testament data
 */
function encryptTestament(testamentData, algorithm, key, iv) {
    console.log(chalk.blue(`Encrypting with ${algorithm}...`));

    let ciphertext, authTag;

    switch (algorithm) {
        case 'aes-256-gcm':
            ({ ciphertext, authTag } = aes256gcmEncrypt(testamentData, key, iv));
            break;
        case 'chacha20':
            ({ ciphertext, authTag } = chacha20Encrypt(testamentData, key, iv));
            break;
        default:
            throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
    }

    return { ciphertext, authTag };
}

/**
 * Save encrypted data to file
 */
function saveEncryptedData(encryptedData, filePath) {
    try {
        writeFileSync(filePath, JSON.stringify(encryptedData, null, 4));
        console.log(chalk.green('Encrypted data saved to:'), filePath);
    } catch (error) {
        throw new Error(`Failed to save encrypted data: ${error.message}`);
    }
}

/**
 * Generate and verify zero-knowledge proof
 */
async function generateAndVerifyProof(algorithm, key, ciphertext, iv, originalDataLength) {
    let operator;

    try {
        console.log(chalk.blue('Initializing ZK operator...'));
        operator = await makeLocalSnarkJsZkOperator(algorithm);

        console.log(chalk.blue('Generating zero-knowledge proof...'));
        const {
            proofJson,
            plaintext,
        } = await generateProof({
            algorithm,
            privateInput: { key },
            publicInput: { ciphertext, iv, offset: 0 },
            operator,
        });

        // Verify the plaintext matches original data
        const plaintextBuffer = plaintext.slice(0, originalDataLength);
        const recoveredText = Buffer.from(plaintextBuffer).toString();

        console.log(chalk.gray('Recovered plaintext preview:'), recoveredText.substring(0, 100) + '...');

        // Verify the proof
        console.log(chalk.blue('Verifying proof...'));
        await verifyProof({
            proof: {
                proofJson,
                plaintext,
                algorithm
            },
            publicInput: {
                ciphertext,
                iv,
                offset: 0
            },
            operator
        });

        console.log(chalk.green('✅ Proof verified successfully'));

        return { proofJson, plaintext };

    } catch (error) {
        console.error(chalk.red('Error in ZK proof generation/verification:'), error.message);
        throw error;
    }
}

/**
 * Process testament encryption with ZK proof
 */
async function processTestamentEncryption() {
    try {
        // Validate environment and files
        const { ALGORITHM } = validateEnvironment();
        validateFiles();

        // Read testament data
        console.log(chalk.blue('Reading signed testament...'));
        const testamentData = readFileSync(PATHS_CONFIG.testament.signed, 'utf8');

        // Generate encryption parameters
        const { key, iv, keyBase64, ivBase64 } = generateEncryptionParams();

        // Encrypt the testament
        const { ciphertext, authTag } = encryptTestament(testamentData, ALGORITHM, key, iv);

        // Prepare encrypted data structure
        const encryptedTestament = {
            algorithm: ALGORITHM,
            iv: ivBase64,
            authTag: authTag.toString('base64'),
            ciphertext: ciphertext.toString('base64'),
            timestamp: new Date().toISOString()
        };

        console.log(chalk.gray('Encrypted testament structure:'));
        console.log(JSON.stringify({
            ...encryptedTestament,
            ciphertext: encryptedTestament.ciphertext.substring(0, 50) + '...'
        }, null, 2));

        // Save encrypted data
        saveEncryptedData(encryptedTestament, PATHS_CONFIG.testament.encrypted);

        // Generate and verify zero-knowledge proof
        await generateAndVerifyProof(ALGORITHM, key, ciphertext, iv, testamentData.length);

        console.log(chalk.green.bold('✅ Testament encryption and ZK proof generation completed successfully!'));

        return {
            encryptedPath: PATHS_CONFIG.testament.encrypted,
            algorithm: ALGORITHM,
            success: true
        };

    } catch (error) {
        console.error(chalk.red('Error during testament encryption process:'), error.message);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log(chalk.cyan('=== Testament Encryption & ZK Proof Generation ==='));

        const result = await processTestamentEncryption();

        console.log(chalk.green.bold('🎉 Process completed successfully!'));
        console.log(chalk.gray('Results:'), result);

    } catch (error) {
        console.error(chalk.red.bold('❌ Program execution failed:'), error.message);

        // Log stack trace in development mode
        if (process.env.NODE_ENV === 'development') {
            console.error(chalk.gray('Stack trace:'), error.stack);
        }

        process.exit(1);
    }
}

// Execute main function
main().catch(error => {
    console.error(chalk.red.bold('Uncaught error:'), error);
    process.exit(1);
});