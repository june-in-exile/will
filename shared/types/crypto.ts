import { CRYPTO_CONFIG } from "../config.js";
import { Base64String } from "./encoding.js";

// Input types for hashing functions
export type HashableInput = string | number | boolean | object;
export type ByteInput = Uint8Array | ArrayBuffer | Buffer | number[];

export type SupportedAlgorithm = (typeof CRYPTO_CONFIG.supportedAlgorithms)[number];

// Configuration interfaces
export interface EncryptionConfig {
  keySize: number;
  ivSize: number;
  supportedAlgorithms: string[];
  maxPlaintextSize: number;
}

export interface EncryptedData {
  algorithm: string;
  iv: Base64String;
  authTag: Base64String;
  ciphertext: Base64String;
  timestamp: string;
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
export interface EncryptionResult {
  ciphertext: Buffer;
  authTag: Buffer;
}

export interface HashValidationResult {
  valid: boolean;
  error?: string;
}

export interface SignatureValidationResult {
  valid: boolean;
  signer?: string;
  error?: string;
}

// Crypto-specific interfaces for Node.js crypto module
import type { Cipheriv, Decipheriv } from "crypto";

export interface AuthenticatedCipher extends Cipheriv {
  getAuthTag(): Buffer;
}

export interface AuthenticatedDecipher extends Decipheriv {
  setAuthTag(tag: Buffer): this;
}

// ZKP interfaces
export interface ProofData {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint];
}
