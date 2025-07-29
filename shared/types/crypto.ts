import { CRYPTO_CONFIG } from "@config";
import { Base64String } from "./base64String.js";

// Input types for hashing functions
export type HashableInput = string | number | boolean | object;
export type ByteInput = Uint8Array | ArrayBuffer | Buffer | number[];

export type SupportedAlgorithm =
  (typeof CRYPTO_CONFIG.supportedAlgorithms)[number];

// Configuration interfaces

export interface EncryptionArgs {
  algorithm: SupportedAlgorithm;
  plaintext: Buffer;
  key: Buffer;
  iv: Buffer;
}

export interface DecryptionArgs {
  algorithm: SupportedAlgorithm;
  ciphertext: Buffer;
  key: Buffer;
  iv: Buffer;
  authTag: Buffer;
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
