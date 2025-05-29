import { PATHS_CONFIG, CRYPTO_CONFIG } from '../../config.js';
import { createDecipheriv } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import chalk from 'chalk';

/**
 * Validate key file existence and format
 */
function validateKeyFile(keyPath) {
    if (!existsSync(keyPath)) {
        throw new Error(`Encryption key file not found: ${keyPath}`);
    }

    try {
        const keyContent = readFileSync(keyPath, 'utf8').trim();

        if (!keyContent) {
            throw new Error('Key file is empty');
        }

        // Validate base64 format
        const keyBuffer = Buffer.from(keyContent, 'base64');
        if (keyBuffer.length !== CRYPTO_CONFIG.keySize) {
            throw new Error(`Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${keyBuffer.length} bytes`);
        }

        return keyContent;

    } catch (error) {
        if (error.message.includes('Invalid key size')) {
            throw error;
        }
        throw new Error(`Failed to read or validate key file: ${error.message}`);
    }
}

/**
 * Validate decryption parameters
 */
function validateDecryptionParams(ciphertext, key, iv, authTag, algorithm) {
    // Validate algorithm
    if (!CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm)) {
        throw new Error(`Unsupported decryption algorithm: ${algorithm}. Supported: ${CRYPTO_CONFIG.supportedAlgorithms.join(', ')}`);
    }

    // Validate ciphertext
    if (!Buffer.isBuffer(ciphertext)) {
        throw new Error('Ciphertext must be a Buffer');
    }

    if (ciphertext.length === 0) {
        throw new Error('Ciphertext cannot be empty');
    }

    if (ciphertext.length > CRYPTO_CONFIG.maxPlaintextSize) {
        throw new Error(`Ciphertext too large: ${ciphertext.length} bytes (max: ${CRYPTO_CONFIG.maxPlaintextSize} bytes)`);
    }

    // Validate key
    if (!Buffer.isBuffer(key)) {
        throw new Error('Key must be a Buffer');
    }

    if (key.length !== CRYPTO_CONFIG.keySize) {
        throw new Error(`Invalid key size: expected ${CRYPTO_CONFIG.keySize} bytes, got ${key.length} bytes`);
    }

    // Validate IV
    if (!Buffer.isBuffer(iv)) {
        throw new Error('IV must be a Buffer');
    }

    const expectedIvSize = algorithm === 'aes-256-gcm' ? 12 : 12; // Both use 12 bytes for these algorithms
    if (iv.length !== expectedIvSize) {
        throw new Error(`Invalid IV size for ${algorithm}: expected ${expectedIvSize} bytes, got ${iv.length} bytes`);
    }

    // Validate auth tag
    if (!Buffer.isBuffer(authTag)) {
        throw new Error('Auth tag must be a Buffer');
    }

    const expectedAuthTagSize = 16; // Both algorithms use 16-byte auth tags
    if (authTag.length !== expectedAuthTagSize) {
        throw new Error(`Invalid auth tag size: expected ${expectedAuthTagSize} bytes, got ${authTag.length} bytes`);
    }
}

/**
 * Generic decryption function with comprehensive validation
 */
function performDecryption(algorithm, ciphertext, key, iv, authTag) {
    try {
        // Validate all parameters
        validateDecryptionParams(ciphertext, key, iv, authTag, algorithm);

        // Create decipher
        const decipher = createDecipheriv(algorithm, key, iv);

        // Set auth tag for authenticated encryption
        decipher.setAuthTag(authTag);

        // Perform decryption
        const chunks = [];
        chunks.push(decipher.update(ciphertext));
        chunks.push(decipher.final());

        const plaintext = Buffer.concat(chunks);

        // Validate result
        if (plaintext.length === 0) {
            throw new Error('Decryption resulted in empty plaintext');
        }

        // Convert to string with error handling
        try {
            return plaintext.toString(CRYPTO_CONFIG.outputEncoding);
        } catch (encodingError) {
            throw new Error(`Failed to decode plaintext as ${CRYPTO_CONFIG.outputEncoding}: ${encodingError.message}`);
        }

    } catch (error) {
        // Enhanced error messages for common decryption failures
        if (error.message.includes('Unsupported state') || error.message.includes('auth')) {
            throw new Error(`Authentication failed - invalid auth tag or corrupted data: ${error.message}`);
        }

        if (error.message.includes('Invalid key length') || error.message.includes('Invalid IV length')) {
            throw new Error(`Crypto parameter error: ${error.message}`);
        }

        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Get decryption key with validation
 */
export function getDecryptionKey() {
    try {
        const key = validateKeyFile(PATHS_CONFIG.crypto.keyFile);

        // Additional security check - ensure key is not obviously weak
        const keyBuffer = Buffer.from(key, 'base64');
        const isAllZeros = keyBuffer.every(byte => byte === 0);
        const isAllOnes = keyBuffer.every(byte => byte === 255);

        if (isAllZeros || isAllOnes) {
            console.warn(chalk.yellow('⚠️ Warning: Detected potentially weak encryption key'));
        }

        return key;

    } catch (error) {
        if (error.message.includes('not found')) {
            throw new Error('NO_ENCRYPTION_KEY');
        }
        throw error;
    }
}

/**
 * AES-256-GCM decryption with enhanced validation
 */
export function aes256gcmDecrypt(ciphertext, key, iv, authTag) {
    try {
        return performDecryption('aes-256-gcm', ciphertext, key, iv, authTag);
    } catch (error) {
        throw new Error(`AES-256-GCM decryption failed: ${error.message}`);
    }
}

/**
 * ChaCha20-Poly1305 decryption with enhanced validation
 */
export function chacha20Decrypt(ciphertext, key, iv, authTag) {
    try {
        return performDecryption('chacha20-poly1305', ciphertext, key, iv, authTag);
    } catch (error) {
        throw new Error(`ChaCha20-Poly1305 decryption failed: ${error.message}`);
    }
}

/**
 * Utility function to get supported algorithms
 */
export function getSupportedDecryptionAlgorithms() {
    return [...CRYPTO_CONFIG.supportedAlgorithms];
}

/**
 * Utility function to validate if algorithm is supported
 */
export function isDecryptionAlgorithmSupported(algorithm) {
    return CRYPTO_CONFIG.supportedAlgorithms.includes(algorithm);
}