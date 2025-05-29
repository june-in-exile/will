// Input types for hashing functions
export type HashableInput = string | number | boolean | object;
export type ByteInput = Uint8Array | ArrayBuffer | Buffer | number[];

// Encryption/Decryption interfaces
export interface EncryptionResult {
    ciphertext: Buffer;
    authTag: Buffer;
}

// Configuration interfaces
export interface EncryptionConfig {
    keySize: number;
    ivSize: number;
    supportedAlgorithms: string[];
    maxPlaintextSize: number;
}

export interface HashConfig {
    maxInputSize: number;
    supportedEncodings: string[];
    expectedHashLength: number;
    enableValidation: boolean;
}

export interface SignatureConfig {
    maxMessageLength: number;
    privateKeyLength: number;
    signatureLength: number;
    maxRetries: number;
}

// Result interfaces
export interface SignatureValidationResult {
    valid: boolean;
    signer?: string;
    error?: string;
}

export interface HashValidationResult {
    valid: boolean;
    error?: string;
}

// Crypto-specific interfaces for Node.js crypto module
import type { Cipher, Decipher } from 'crypto';

export interface AuthenticatedCipher extends Cipher {
    getAuthTag(): Buffer;
}

export interface AuthenticatedDecipher extends Decipher {
    setAuthTag(tag: Buffer): this;
}