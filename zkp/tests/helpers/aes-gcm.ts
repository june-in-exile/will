/**
 * AES-128/192/256-GCM TypeScript Implementation (Supports Arbitrary Length IV)
 */

import {
  CipherGCM,
  createCipheriv,
  createDecipheriv,
  DecipherGCM,
} from "crypto";

// Define supported AES key sizes
export type AESKeySize = 128 | 192 | 256;

// Configuration for different AES variants
interface AESConfig {
  keyLength: number; // Key length in bytes
  rounds: number; // Number of rounds
  expandedKeyLength: number; // Expanded key length in bytes
}

const AES_CONFIGS: Record<AESKeySize, AESConfig> = {
  128: { keyLength: 16, rounds: 10, expandedKeyLength: 176 },
  192: { keyLength: 24, rounds: 12, expandedKeyLength: 208 },
  256: { keyLength: 32, rounds: 14, expandedKeyLength: 240 },
};

class AESUtils {
  static bytesToHex(bytes: Buffer): string {
    return bytes.toString("hex");
  }

  static hexToBytes(hex: string): Buffer {
    return Buffer.from(hex, "hex");
  }

  static xor(a: Buffer, b: Buffer): Buffer {
    const result = Buffer.alloc(Math.min(a.length, b.length));
    for (let i = 0; i < result.length; i++) {
      result[i] = a[i] ^ b[i];
    }
    return result;
  }

  static u32ToBytes(value: number): Buffer {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(value, 0);
    return buffer;
  }

  static bytesToU32(bytes: Buffer, offset: number = 0): number {
    return bytes.readUInt32BE(offset);
  }

  static randomBytes(length: number): Buffer {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(length)));
  }

  static bytesToBase64(bytes: Buffer): string {
    return bytes.toString("base64");
  }

  static base64ToBytes(base64: string): Buffer {
    return Buffer.from(base64, "base64");
  }

  static stringToBytes(str: string): Buffer {
    return Buffer.from(str, "utf8");
  }

  static bytesToString(bytes: Buffer): string {
    return bytes.toString("utf8");
  }

  /**
   * Validate key size and return configuration
   */
  static validateKeySize(key: Buffer): AESConfig {
    const keyLength = key.length;
    let config: AESConfig | undefined;

    switch (keyLength) {
      case 16:
        config = AES_CONFIGS[128];
        break;
      case 24:
        config = AES_CONFIGS[192];
        break;
      case 32:
        config = AES_CONFIGS[256];
        break;
      default:
        throw new Error(
          `Invalid key length: ${keyLength} bytes. Supported lengths: 16 (AES-128), 24 (AES-192), 32 (AES-256)`,
        );
    }

    return config;
  }

  /**
   * Get AES variant name from key length
   */
  static getAESVariant(keyLength: number): string {
    switch (keyLength) {
      case 16:
        return "AES-128";
      case 24:
        return "AES-192";
      case 32:
        return "AES-256";
      default:
        throw new Error(`Unsupported key length: ${keyLength}`);
    }
  }
}

class AESSbox {
  static readonly SBOX = Buffer.from([
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b,
    0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0,
    0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26,
    0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2,
    0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0,
    0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed,
    0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f,
    0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5,
    0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec,
    0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
    0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c,
    0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d,
    0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f,
    0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e,
    0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11,
    0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f,
    0xb0, 0x54, 0xbb, 0x16,
  ]);

  static substitute(input: number): number {
    return this.SBOX[input];
  }

  static substituteBytes(bytes: Buffer): Buffer {
    const result = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      result[i] = this.SBOX[bytes[i]];
    }
    return result;
  }
}

class GaloisField {
  static multiply(a: number, b: number): number {
    let result = 0;
    let temp_a = a;
    let temp_b = b;

    for (let i = 0; i < 8; i++) {
      if (temp_b & 1) {
        result ^= temp_a;
      }

      const carry = temp_a & 0x80;
      temp_a <<= 1;
      temp_a &= 0xff;

      if (carry) {
        temp_a ^= 0x1b;
      }

      temp_b >>= 1;
    }

    return result;
  }

  static readonly MUL2 = Buffer.alloc(256);
  static readonly MUL3 = Buffer.alloc(256);

  static initMultiplicationTables() {
    for (let i = 0; i < 256; i++) {
      this.MUL2[i] = this.multiply(i, 2);
      this.MUL3[i] = this.multiply(i, 3);
    }
  }

  static fastMul2(x: number): number {
    return this.MUL2[x];
  }

  static fastMul3(x: number): number {
    return this.MUL3[x];
  }
}

GaloisField.initMultiplicationTables();

class AESTransforms {
  static subBytes(state: Buffer): Buffer {
    return AESSbox.substituteBytes(state);
  }

  static shiftRows(state: Buffer): Buffer {
    const result = Buffer.alloc(16);

    // Row 0: no shift
    result[0] = state[0];
    result[4] = state[4];
    result[8] = state[8];
    result[12] = state[12];

    // Row 1: left shift by 1
    result[1] = state[5];
    result[5] = state[9];
    result[9] = state[13];
    result[13] = state[1];

    // Row 2: left shift by 2
    result[2] = state[10];
    result[6] = state[14];
    result[10] = state[2];
    result[14] = state[6];

    // Row 3: left shift by 3
    result[3] = state[15];
    result[7] = state[3];
    result[11] = state[7];
    result[15] = state[11];

    return result;
  }

  static mixColumn(state: Buffer): Buffer {
    const result = Buffer.alloc(4);

    const s0 = state[0];
    const s1 = state[1];
    const s2 = state[2];
    const s3 = state[3];

    result[0] = GaloisField.fastMul2(s0) ^ GaloisField.fastMul3(s1) ^ s2 ^ s3;
    result[1] = s0 ^ GaloisField.fastMul2(s1) ^ GaloisField.fastMul3(s2) ^ s3;
    result[2] = s0 ^ s1 ^ GaloisField.fastMul2(s2) ^ GaloisField.fastMul3(s3);
    result[3] = GaloisField.fastMul3(s0) ^ s1 ^ s2 ^ GaloisField.fastMul2(s3);

    return result;
  }

  static mixColumns(state: Buffer): Buffer {
    const result = Buffer.alloc(16);

    for (let col = 0; col < 4; col++) {
      const offset = col * 4;
      const column = state.subarray(offset, offset + 4);
      const mixed = this.mixColumn(column);
      mixed.copy(result, offset);
    }

    return result;
  }

  static addRoundKey(state: Buffer, roundKey: Buffer): Buffer {
    return AESUtils.xor(state, roundKey);
  }
}

class AESKeyExpansion {
  static readonly RCON = Buffer.from([
    0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8,
    0xab, 0x4d, 0x9a, 0x2f,
  ]);

  static rotWord(word: Buffer): Buffer {
    return Buffer.from([word[1], word[2], word[3], word[0]]);
  }

  static subWord(word: Buffer): Buffer {
    return AESSbox.substituteBytes(word);
  }

  /**
   * Expand key for AES-128, AES-192, or AES-256
   * Automatically detects key size and expands accordingly
   */
  static expandKey(key: Buffer): Buffer[] {
    const config = AESUtils.validateKeySize(key);
    const keySize = key.length;
    const rounds = config.rounds;
    const expandedKeyLength = config.expandedKeyLength;

    const roundKeys: Buffer[] = [];
    const expandedKey = Buffer.alloc(expandedKeyLength);

    // Copy original key
    key.copy(expandedKey, 0);

    let i = keySize;
    let rconIndex = 0;

    while (i < expandedKeyLength) {
      const prevWord = expandedKey.subarray(i - 4, i);
      let newWord: Buffer;

      if (i % keySize === 0) {
        // For all AES variants: apply SubWord and RotWord every Nk words
        const rotated = this.rotWord(prevWord);
        const substituted = this.subWord(rotated);
        const rconValue = Buffer.from([this.RCON[rconIndex], 0, 0, 0]);
        newWord = AESUtils.xor(substituted, rconValue);
        rconIndex++;
      } else if (keySize === 32 && i % keySize === 16) {
        // For AES-256 only: apply SubWord every 4 words after the first SubWord+RotWord
        newWord = this.subWord(prevWord);
      } else {
        // Standard case: copy previous word
        newWord = Buffer.from(prevWord);
      }

      // XOR with the word from Nk positions back
      const prevRoundWord = expandedKey.subarray(i - keySize, i - keySize + 4);
      const finalWord = AESUtils.xor(newWord, prevRoundWord);
      finalWord.copy(expandedKey, i);

      i += 4;
    }

    // Extract round keys (16 bytes each)
    for (let round = 0; round <= rounds; round++) {
      roundKeys.push(expandedKey.subarray(round * 16, (round + 1) * 16));
    }

    return roundKeys;
  }
}

class AES {
  /**
   * Encrypt a single 16-byte block using AES
   * Supports AES-128, AES-192, and AES-256 based on key size
   */
  static encryptBlock(plaintext: Buffer, key: Buffer): Buffer {
    if (plaintext.length !== 16) {
      throw new Error("Plaintext must be exactly 16 bytes");
    }

    const config = AESUtils.validateKeySize(key);
    const rounds = config.rounds;
    const roundKeys = AESKeyExpansion.expandKey(key);

    let state = Buffer.from(plaintext);

    // Initial round
    state = AESTransforms.addRoundKey(state, roundKeys[0]);

    // Main rounds
    for (let round = 1; round < rounds; round++) {
      state = AESTransforms.subBytes(state);
      state = AESTransforms.shiftRows(state);
      state = AESTransforms.mixColumns(state);
      state = AESTransforms.addRoundKey(state, roundKeys[round]);
    }

    // Final round (without MixColumns)
    state = AESTransforms.subBytes(state);
    state = AESTransforms.shiftRows(state);
    state = AESTransforms.addRoundKey(state, roundKeys[rounds]);

    return state;
  }
}

// GF(2^128) operations for GHASH
class GF128 {
  /**
   * GF(2^128) multiplication using reduction polynomial f(x) = x^128 + x^7 + x^2 + x + 1
   */
  static multiply(x: Buffer, y: Buffer): Buffer {
    const result = Buffer.alloc(16);
    const v = Buffer.from(y);

    // Process each bit of x
    for (let i = 0; i < 128; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);

      // If current bit of x is 1, add v to result
      if ((x[byteIndex] >> bitIndex) & 1) {
        for (let j = 0; j < 16; j++) {
          result[j] ^= v[j];
        }
      }

      // Right shift v by one bit
      let carry = 0;
      for (let j = 0; j < 16; j++) {
        const newCarry = v[j] & 1;
        v[j] = (v[j] >> 1) | (carry << 7);
        carry = newCarry;
      }

      // If the right shift caused a carry-out (i.e., the lowest bit of the
      // highest-order byte was 1), we need to apply the reduction polynomial.
      //
      // In GF(2), x^128 ≡ x^7 + x^2 + x + 1  (mod f(x))
      //
      // So we XOR 0xe1 (binary 11100001) into the lowest byte of v (v[0]),
      // which sets the coefficients for x^7, x^2, x^1, and x^0.
      if (carry) {
        v[0] ^= 0xe1;
      }
    }

    return result;
  }
}

class AESGCM {
  /**
   * Increment counter for CTR mode (increments last 4 bytes only)
   */
  static incrementCounter(counter: Buffer): void {
    let carry = 1;
    for (let j = 15; j >= 12 && carry; j--) {
      const sum = counter[j] + carry;
      counter[j] = sum & 0xff;
      carry = sum >> 8;
    }
  }

  /**
   * CTR mode encryption/decryption
   */
  static ctrEncrypt(plaintext: Buffer, key: Buffer, iv: Buffer): Buffer {
    const numBlocks = Math.ceil(plaintext.length / 16);
    const ciphertext = Buffer.alloc(plaintext.length);

    const counter = Buffer.from(iv);

    for (let i = 0; i < numBlocks; i++) {
      // Encrypt current counter
      const keystream = AES.encryptBlock(counter, key);

      // Increment counter (only last 4 bytes)
      this.incrementCounter(counter);

      // XOR with plaintext
      const blockStart = i * 16;
      const blockEnd = Math.min(blockStart + 16, plaintext.length);
      const plaintextBlock = plaintext.subarray(blockStart, blockEnd);

      for (let j = 0; j < plaintextBlock.length; j++) {
        ciphertext[blockStart + j] = plaintextBlock[j] ^ keystream[j];
      }
    }

    return ciphertext;
  }

  /**
   * GHASH authentication function
   */
  static ghash(data: Buffer, hashKey: Buffer): Buffer {
    let result = Buffer.alloc(16);

    // Process each 16-byte block
    for (let i = 0; i < data.length; i += 16) {
      const block = Buffer.alloc(16);
      const actualLength = Math.min(16, data.length - i);
      data.subarray(i, i + actualLength).copy(block, 0);

      // GHASH operation: result = (result ⊕ block) × H
      for (let j = 0; j < 16; j++) {
        result[j] ^= block[j];
      }

      result = GF128.multiply(result, hashKey);
    }

    return result;
  }

  /**
   * Compute J0 value, supports arbitrary length IV
   * According to NIST SP 800-38D standard:
   * - If IV length is 96 bits (12 bytes): J0 = IV || 0x00000001
   * - Otherwise: J0 = GHASH_H(IV || 0^(s+64) || [len(IV)]64)
   */
  static computeJ0(iv: Buffer, hashKey: Buffer): Buffer {
    if (iv.length === 12) {
      // Standard case: IV is 12 bytes
      const j0 = Buffer.alloc(16);
      iv.copy(j0, 0, 0, 12);
      j0.writeUInt32BE(1, 12); // J0 = IV || 0x00000001
      return j0;
    } else {
      // Non-standard case: use GHASH to compute J0
      // Calculate required padding
      const s = (128 - ((iv.length * 8) % 128)) % 128; // padding to 128-bit boundary
      const paddingBytes = Math.floor(s / 8);

      // Build GHASH input: IV || 0^(s+64) || [len(IV)]64
      const ghashInputLength = iv.length + paddingBytes + 8 + 8; // +8 for zero padding, +8 for length
      const ghashInput = Buffer.alloc(ghashInputLength);

      let offset = 0;

      // Copy IV
      iv.copy(ghashInput, offset);
      offset += iv.length;

      // Add padding to 128-bit boundary + additional 64 zero bits
      offset += paddingBytes + 8; // Skip zero padding section

      // Add IV length (in bits, 64-bit big endian)
      const ivLengthBits = iv.length * 8;
      ghashInput.writeUInt32BE(Math.floor(ivLengthBits / 0x100000000), offset);
      ghashInput.writeUInt32BE(ivLengthBits & 0xffffffff, offset + 4);

      // Use GHASH to compute J0
      return this.ghash(ghashInput, hashKey);
    }
  }

  /**
   * AES-GCM encryption (supports AES-128, AES-192, AES-256)
   */
  static encrypt(
    plaintext: Buffer,
    key: Buffer,
    iv: Buffer,
    additionalData: Buffer = Buffer.alloc(0),
  ): { ciphertext: Buffer; authTag: Buffer } {
    // 1. Generate hash subkey: H = CIPH_K(0^128)
    const zeroBlock = Buffer.alloc(16);
    const hashKey = AES.encryptBlock(zeroBlock, key);

    // 2. Compute J0 (supports arbitrary length IV)
    const j0 = this.computeJ0(iv, hashKey);

    // CTR encryption uses incremented J0
    const incrementedJ0 = Buffer.from(j0);
    this.incrementCounter(incrementedJ0);

    // 3. CTR mode encryption
    const ciphertext = this.ctrEncrypt(plaintext, key, incrementedJ0);

    // 4. Calculate padding v(aadPadding), u(ciphertextPadding)
    const aadPadding = (16 - (additionalData.length % 16)) % 16;
    const ciphertextPadding = (16 - (ciphertext.length % 16)) % 16;

    // 5. S = GHASH_H(AAD || 0^v || C || 0^u || [len(AAD)]64 || [len(C)]64)
    const authDataLength =
      additionalData.length +
      aadPadding +
      ciphertext.length +
      ciphertextPadding +
      16;
    const authData = Buffer.alloc(authDataLength);

    let offset = 0;

    // Add AAD
    additionalData.copy(authData, offset);
    offset += additionalData.length + aadPadding;

    // Add ciphertext
    ciphertext.copy(authData, offset);
    offset += ciphertext.length + ciphertextPadding;

    // Add length information (64-bit big endian)
    const aadLengthBits = additionalData.length * 8;
    const ciphertextLengthBits = ciphertext.length * 8;

    authData.writeUInt32BE(Math.floor(aadLengthBits / 0x100000000), offset);
    authData.writeUInt32BE(aadLengthBits & 0xffffffff, offset + 4);
    authData.writeUInt32BE(
      Math.floor(ciphertextLengthBits / 0x100000000),
      offset + 8,
    );
    authData.writeUInt32BE(ciphertextLengthBits & 0xffffffff, offset + 12);

    // Calculate GHASH
    let S = this.ghash(authData, hashKey);

    // 6. Final tag calculation: T = GCTR_K(J0, S) = S xor CIPH_K(J0)
    const tagMask = AES.encryptBlock(j0, key);
    S = AESUtils.xor(S, tagMask);

    // 7. Return ciphertext and tag
    return { ciphertext, authTag: S };
  }

  /**
   * AES-GCM decryption (supports AES-128, AES-192, AES-256)
   */
  static decrypt(
    ciphertext: Buffer,
    key: Buffer,
    iv: Buffer,
    authTag: Buffer,
    additionalData: Buffer = Buffer.alloc(0),
  ): Buffer {
    // 1. Validate inputs
    if (authTag.length !== 16) {
      throw new Error("Authentication tag must be 16 bytes");
    }

    // 2. Generate hash subkey: H = CIPH_K(0^128)
    const zeroBlock = Buffer.alloc(16);
    const hashKey = AES.encryptBlock(zeroBlock, key);

    // 3. Compute J0 (supports arbitrary length IV)
    const j0 = this.computeJ0(iv, hashKey);

    // CTR encryption uses incremented J0
    const incrementedJ0 = Buffer.from(j0);
    this.incrementCounter(incrementedJ0);

    // 4. CTR mode decryption (same as encryption since XOR is symmetric)
    const plaintext = this.ctrEncrypt(ciphertext, key, incrementedJ0);

    // 5. Calculate padding v(aadPadding), u(ciphertextPadding)
    const aadPadding = (16 - (additionalData.length % 16)) % 16;
    const ciphertextPadding = (16 - (ciphertext.length % 16)) % 16;

    // 6. S = GHASH_H(AAD || 0^v || C || 0^u || [len(AAD)]64 || [len(C)]64)
    const authDataLength =
      additionalData.length +
      aadPadding +
      ciphertext.length +
      ciphertextPadding +
      16;
    const authData = Buffer.alloc(authDataLength);

    let offset = 0;

    // Add AAD
    additionalData.copy(authData, offset);
    offset += additionalData.length + aadPadding;

    // Add ciphertext
    ciphertext.copy(authData, offset);
    offset += ciphertext.length + ciphertextPadding;

    // Add length information (64-bit big endian)
    const aadLengthBits = additionalData.length * 8;
    const ciphertextLengthBits = ciphertext.length * 8;

    authData.writeUInt32BE(Math.floor(aadLengthBits / 0x100000000), offset);
    authData.writeUInt32BE(aadLengthBits & 0xffffffff, offset + 4);
    authData.writeUInt32BE(
      Math.floor(ciphertextLengthBits / 0x100000000),
      offset + 8,
    );
    authData.writeUInt32BE(ciphertextLengthBits & 0xffffffff, offset + 12);

    // Calculate GHASH
    const S = this.ghash(authData, hashKey);

    // 7. Final tag calculation: T = GCTR_K(J0, S) = S xor CIPH_K(J0)
    const tagMask = AES.encryptBlock(j0, key);
    const expectedAuthTag = AESUtils.xor(S, tagMask);

    // 8. Verify authentication tag and return plaintext
    if (!expectedAuthTag.equals(authTag)) {
      throw new Error("Authentication failed: Invalid authentication tag");
    }

    return plaintext;
  }
}

// Universal easy-to-use interface
class AESGCMEasy {
  /**
   * Auto-detect AES variant and encrypt
   */
  static encrypt(
    plaintext: string,
    keyBase64?: string,
    ivBase64?: string,
    keySize: AESKeySize = 256,
  ): {
    variant: string;
    key: string;
    iv: string;
    ciphertext: string;
    authTag: string;
  } {
    const config = AES_CONFIGS[keySize];
    const keyBytes = keyBase64
      ? AESUtils.base64ToBytes(keyBase64)
      : AESUtils.randomBytes(config.keyLength);
    const ivBytes = ivBase64
      ? AESUtils.base64ToBytes(ivBase64)
      : AESUtils.randomBytes(12);

    // Validate key size matches expected
    if (keyBytes.length !== config.keyLength) {
      throw new Error(
        `Key size mismatch: expected ${config.keyLength} bytes for ${AESUtils.getAESVariant(config.keyLength)}, got ${keyBytes.length} bytes`,
      );
    }

    const plaintextBytes = AESUtils.stringToBytes(plaintext);
    const result = AESGCM.encrypt(plaintextBytes, keyBytes, ivBytes);

    return {
      variant: AESUtils.getAESVariant(keyBytes.length),
      key: AESUtils.bytesToBase64(keyBytes),
      iv: AESUtils.bytesToBase64(ivBytes),
      ciphertext: AESUtils.bytesToBase64(result.ciphertext),
      authTag: AESUtils.bytesToBase64(result.authTag),
    };
  }

  /**
   * Auto-detect AES variant and encrypt block
   */
  static encryptBlock(
    plaintext: string,
    keyBase64: string,
  ): { variant: string; key: string; plaintext: string; ciphertext: string } {
    const keyBytes = AESUtils.base64ToBytes(keyBase64);
    const variant = AESUtils.getAESVariant(keyBytes.length);
    const plaintextBytes = AESUtils.stringToBytes(plaintext);

    const paddedPlaintext = Buffer.alloc(16);
    plaintextBytes.subarray(0, 16).copy(paddedPlaintext);

    const ciphertext = AES.encryptBlock(paddedPlaintext, keyBytes);

    return {
      variant,
      key: keyBase64,
      plaintext: plaintext,
      ciphertext: AESUtils.bytesToBase64(ciphertext),
    };
  }

  /**
   * Auto-detect AES variant and decrypt
   */
  static decrypt(
    ciphertextBase64: string,
    keyBase64: string,
    ivBase64: string,
    authTagBase64: string,
  ): string {
    const ciphertext = AESUtils.base64ToBytes(ciphertextBase64);
    const key = AESUtils.base64ToBytes(keyBase64);
    const iv = AESUtils.base64ToBytes(ivBase64);
    const authTag = AESUtils.base64ToBytes(authTagBase64);

    const plaintext = AESGCM.decrypt(ciphertext, key, iv, authTag);
    return AESUtils.bytesToString(plaintext);
  }

  /**
   * Decrypt encryption result object
   */
  static decryptResult(encryptedData: {
    key: string;
    iv: string;
    ciphertext: string;
    authTag: string;
  }): string {
    return this.decrypt(
      encryptedData.ciphertext,
      encryptedData.key,
      encryptedData.iv,
      encryptedData.authTag,
    );
  }
}

class AESVerification {
  /**
   * Test ECB encryption for all AES variants
   */
  static testECBEncrypt(): boolean {
    console.log(
      "\n=== Node.js crypto module AES ECB encryption verification ===",
    );

    let allPassed = true;

    // Test data
    const plaintext = AESUtils.stringToBytes("This is a secret");
    const keys = {
      128: AESUtils.base64ToBytes("qmpEWRQQ+w1hp6xFYkoXFQ=="), // 16 bytes
      192: AESUtils.base64ToBytes("qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XT"), // 24 bytes
      256: AESUtils.base64ToBytes(
        "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=",
      ), // 32 bytes
    };

    for (const [keySize, key] of Object.entries(keys)) {
      console.log(`\n--- AES-${keySize} ---`);

      const cipherName = `aes-${keySize}-ecb`;
      const cipher = createCipheriv(cipherName, key, null);
      cipher.setAutoPadding(false);

      let expectedCiphertext = cipher.update(plaintext);
      expectedCiphertext = Buffer.concat([expectedCiphertext, cipher.final()]);
      console.log(
        "Node.js crypto:",
        AESUtils.bytesToBase64(expectedCiphertext),
      );

      const ourCiphertext = AES.encryptBlock(plaintext, key);
      const isEqual = ourCiphertext.equals(expectedCiphertext);

      console.log(
        "Our implementation:",
        AESUtils.bytesToBase64(ourCiphertext),
        isEqual ? "✅" : "❌",
      );

      allPassed = allPassed && isEqual;
    }

    return allPassed;
  }

  /**
   * Test CTR mode encryption for all AES variants
   * Verifies our CTR implementation against Node.js crypto module
   */
  static testCTREncrypt(): boolean {
    console.log(
      "\n=== Node.js crypto module AES CTR encryption verification ===",
    );

    let allPassed = true;

    // Test data
    const plaintext = AESUtils.stringToBytes(
      "This is a test message for CTR mode encryption!",
    );
    const keys = {
      128: AESUtils.base64ToBytes("qmpEWRQQ+w1hp6xFYkoXFQ=="), // 16 bytes
      192: AESUtils.base64ToBytes("qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XT"), // 24 bytes
      256: AESUtils.base64ToBytes(
        "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=",
      ), // 32 bytes
    };

    // Test with different IV lengths to verify arbitrary IV support
    const testIVs = [
      { name: "Standard 16-byte", iv: AESUtils.randomBytes(16) },
      { name: "GCM standard 12-byte", iv: AESUtils.randomBytes(12) },
      { name: "Custom 8-byte", iv: AESUtils.randomBytes(8) },
    ];

    for (const [keySize, key] of Object.entries(keys)) {
      console.log(`\n--- AES-${keySize}-CTR ---`);

      for (const { name, iv } of testIVs) {
        console.log(`\n  Testing with ${name} IV:`);

        // Create initial counter (IV + counter initialization)
        const counter = Buffer.alloc(16);
        if (iv.length <= 16) {
          iv.copy(counter, 0);
        } else {
          // If IV is longer than 16 bytes, take first 16 bytes
          iv.subarray(0, 16).copy(counter, 0);
        }

        try {
          // Node.js crypto CTR encryption
          const cipherName = `aes-${keySize}-ctr`;
          const cipher = createCipheriv(cipherName, key, counter);

          let expectedCiphertext = cipher.update(plaintext);
          expectedCiphertext = Buffer.concat([
            expectedCiphertext,
            cipher.final(),
          ]);

          console.log(
            "    Node.js crypto:",
            AESUtils.bytesToBase64(expectedCiphertext),
          );

          // Our CTR implementation
          const ourCiphertext = AESGCM.ctrEncrypt(plaintext, key, counter);
          const isEqual = ourCiphertext.equals(expectedCiphertext);

          console.log(
            "    Our implementation:",
            AESUtils.bytesToBase64(ourCiphertext),
            isEqual ? "✅" : "❌",
          );

          allPassed = allPassed && isEqual;
        } catch (error) {
          console.log(
            `    Error testing ${keySize}-CTR with ${name} IV:`,
            String(error),
            "❌",
          );
          allPassed = false;
        }
      }
    }

    return allPassed;
  }

  /**
   * Test CTR mode decryption (should be identical to encryption due to XOR property)
   * Verifies that CTR decryption produces original plaintext
   */
  static testCTRDecrypt(): boolean {
    console.log("\n=== AES CTR decryption verification ===");

    let allPassed = true;
    const originalMessage =
      "CTR mode decryption test message with various lengths!";
    const plaintextBytes = AESUtils.stringToBytes(originalMessage);

    const keys = {
      128: AESUtils.randomBytes(16),
      192: AESUtils.randomBytes(24),
      256: AESUtils.randomBytes(32),
    };

    for (const [keySize, key] of Object.entries(keys)) {
      console.log(`\n--- AES-${keySize}-CTR Decryption ---`);

      const iv = AESUtils.randomBytes(12); // Use GCM standard IV length

      // Create counter from IV (GCM style)
      const j0 = Buffer.alloc(16);
      iv.copy(j0, 0);
      j0.writeUInt32BE(1, 12); // Set counter to 1

      // Create incremented counter for encryption
      const encryptionCounter = Buffer.from(j0);
      AESGCM.incrementCounter(encryptionCounter);

      try {
        // Encrypt with our implementation
        const ciphertext = AESGCM.ctrEncrypt(
          plaintextBytes,
          key,
          encryptionCounter,
        );
        console.log("  Encryption successful ✅");

        // Decrypt by encrypting the ciphertext again (CTR property: E(E(P)) = P)
        const decryptionCounter = Buffer.from(j0);
        AESGCM.incrementCounter(decryptionCounter);
        const decryptedBytes = AESGCM.ctrEncrypt(
          ciphertext,
          key,
          decryptionCounter,
        );

        const decryptedMessage = AESUtils.bytesToString(decryptedBytes);
        const success = decryptedMessage === originalMessage;

        console.log("  Original:", originalMessage);
        console.log("  Decrypted:", decryptedMessage);
        console.log("  Decryption successful:", success ? "✅" : "❌");

        allPassed = allPassed && success;
      } catch (error) {
        console.log(
          `  AES-${keySize}-CTR decryption failed:`,
          String(error),
          "❌",
        );
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Test CTR mode with different block sizes and edge cases
   * Verifies handling of partial blocks and various message lengths
   */
  static testCTREdgeCases(): boolean {
    console.log("\n=== AES CTR edge cases and block size testing ===");

    let allPassed = true;
    const key = AESUtils.randomBytes(32); // Use AES-256 for testing

    // Test messages of various lengths
    const testMessages = [
      { name: "Empty message", message: "" },
      { name: "Single byte", message: "A" },
      { name: "15 bytes (< block)", message: "123456789012345" },
      { name: "16 bytes (= block)", message: "1234567890123456" },
      { name: "17 bytes (> block)", message: "12345678901234567" },
      {
        name: "32 bytes (2 blocks)",
        message: "12345678901234567890123456789012",
      },
      {
        name: "33 bytes (2+ blocks)",
        message: "123456789012345678901234567890123",
      },
    ];

    for (const { name, message } of testMessages) {
      console.log(`\n  Testing ${name}:`);

      const plaintextBytes = AESUtils.stringToBytes(message);
      const iv = AESUtils.randomBytes(16);

      try {
        // Our CTR encryption
        const ciphertext = AESGCM.ctrEncrypt(plaintextBytes, key, iv);

        // Verify decryption (encrypt ciphertext again)
        const decryptedBytes = AESGCM.ctrEncrypt(ciphertext, key, iv);
        const decryptedMessage = AESUtils.bytesToString(decryptedBytes);

        const success = decryptedMessage === message;
        console.log("    Length:", plaintextBytes.length, "bytes");
        console.log("    Round trip successful:", success ? "✅" : "❌");

        if (!success) {
          console.log("    Original:", message);
          console.log("    Decrypted:", decryptedMessage);
        }

        allPassed = allPassed && success;
      } catch (error) {
        console.log(`    Error with ${name}:`, String(error), "❌");
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Test CTR counter increment functionality
   * Verifies that counter increments correctly for sequential blocks
   */
  static testCTRCounterIncrement(): boolean {
    console.log("\n=== AES CTR counter increment testing ===");

    let allPassed = true;

    // Test counter increment with various initial values
    const testCounters = [
      {
        name: "Zero counter",
        initial: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      },
      {
        name: "Counter with 1",
        initial: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
      },
      {
        name: "Max low byte",
        initial: Buffer.from([
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255,
        ]),
      },
      {
        name: "Overflow test",
        initial: Buffer.from([
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255,
        ]),
      },
    ];

    for (const { name, initial } of testCounters) {
      console.log(`\n  Testing ${name}:`);

      const counter = Buffer.from(initial);
      const originalValue = counter.readUInt32BE(12);

      console.log("    Before increment:", AESUtils.bytesToHex(counter));

      // Test multiple increments
      for (let i = 1; i <= 3; i++) {
        AESGCM.incrementCounter(counter);
        const newValue = counter.readUInt32BE(12);
        const expectedValue = (originalValue + i) & 0xffffffff;
        const success = newValue === expectedValue;

        console.log(
          `    After increment ${i}:`,
          AESUtils.bytesToHex(counter),
          success ? "✅" : "❌",
        );

        if (!success) {
          console.log(
            `      Expected: ${expectedValue.toString(16).padStart(8, "0")}, Got: ${newValue.toString(16).padStart(8, "0")}`,
          );
        }

        allPassed = allPassed && success;
      }
    }

    return allPassed;
  }

  /**
   * Performance test for CTR mode with large data
   * Tests encryption of larger data sets to verify performance
   */
  static testCTRPerformance(): boolean {
    console.log("\n=== AES CTR performance testing ===");

    let allPassed = true;
    const key = AESUtils.randomBytes(32); // AES-256
    const iv = AESUtils.randomBytes(16);

    // Test with different data sizes
    const dataSizes = [1024, 4096, 16384]; // 1KB, 4KB, 16KB

    for (const size of dataSizes) {
      console.log(`\n  Testing ${size} bytes:`);

      // Generate test data
      const testData = AESUtils.randomBytes(size);

      try {
        const startTime = Date.now();

        // Encrypt
        const ciphertext = AESGCM.ctrEncrypt(testData, key, iv);

        const encryptTime = Date.now() - startTime;
        console.log(`    Encryption time: ${encryptTime}ms`);

        // Verify by decrypting
        const decryptStart = Date.now();
        const decrypted = AESGCM.ctrEncrypt(ciphertext, key, iv);
        const decryptTime = Date.now() - decryptStart;

        console.log(`    Decryption time: ${decryptTime}ms`);

        const success = decrypted.equals(testData);
        console.log("    Data integrity:", success ? "✅" : "❌");

        // Basic performance check (should complete in reasonable time)
        const totalTime = encryptTime + decryptTime;
        const performanceOK = totalTime < 1000; // Should complete within 1 second
        console.log(
          "    Performance:",
          performanceOK ? "✅" : "❌",
          `(${totalTime}ms total)`,
        );

        allPassed = allPassed && success && performanceOK;
      } catch (error) {
        console.log(`    Error with ${size} bytes:`, String(error), "❌");
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Test CTR mode compatibility with GCM J0 computation
   * Verifies that CTR mode works correctly with GCM-style counter initialization
   */
  static testCTRGCMCompatibility(): boolean {
    console.log("\n=== AES CTR compatibility with GCM J0 computation ===");

    let allPassed = true;
    const key = AESUtils.randomBytes(32);
    const plaintext = AESUtils.stringToBytes("GCM compatibility test message");

    // Test with different IV lengths (as used in GCM)
    const testIVs = [
      { name: "12-byte IV (GCM standard)", length: 12 },
      { name: "16-byte IV", length: 16 },
      { name: "8-byte IV", length: 8 },
      { name: "20-byte IV (non-standard)", length: 20 },
    ];

    for (const { name, length } of testIVs) {
      console.log(`\n  Testing ${name}:`);

      const iv = AESUtils.randomBytes(length);

      try {
        // Compute J0 using GCM method
        const zeroBlock = Buffer.alloc(16);
        const hashKey = AES.encryptBlock(zeroBlock, key);
        const j0 = AESGCM.computeJ0(iv, hashKey);

        console.log("    J0 computed:", AESUtils.bytesToHex(j0));

        // Use J0 for CTR encryption (with increment as per GCM spec)
        const ctrCounter = Buffer.from(j0);
        AESGCM.incrementCounter(ctrCounter);

        const ciphertext = AESGCM.ctrEncrypt(plaintext, key, ctrCounter);

        // Verify decryption
        const decryptCounter = Buffer.from(j0);
        AESGCM.incrementCounter(decryptCounter);
        const decrypted = AESGCM.ctrEncrypt(ciphertext, key, decryptCounter);

        const decryptedText = AESUtils.bytesToString(decrypted);
        const success = decryptedText === AESUtils.bytesToString(plaintext);

        console.log("    Original:", AESUtils.bytesToString(plaintext));
        console.log("    Decrypted:", decryptedText);
        console.log("    Compatibility test:", success ? "✅" : "❌");

        allPassed = allPassed && success;
      } catch (error) {
        console.log(`    Error with ${name}:`, String(error), "❌");
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Run all CTR mode tests
   * Comprehensive testing suite for CTR mode functionality
   */
  static runAllCTRTests(): boolean {
    console.log("🧪 Starting AES CTR mode verification...\n");

    const ctrEncryptPassed = this.testCTREncrypt();
    const ctrDecryptPassed = this.testCTRDecrypt();
    const ctrEdgeCasesPassed = this.testCTREdgeCases();
    const ctrCounterPassed = this.testCTRCounterIncrement();
    const ctrPerformancePassed = this.testCTRPerformance();
    const ctrGCMCompatPassed = this.testCTRGCMCompatibility();

    console.log("\n📊 CTR Mode Test Summary:");
    console.log("CTR encryption:", ctrEncryptPassed ? "✅" : "❌");
    console.log("CTR decryption:", ctrDecryptPassed ? "✅" : "❌");
    console.log("CTR edge cases:", ctrEdgeCasesPassed ? "✅" : "❌");
    console.log("Counter increment:", ctrCounterPassed ? "✅" : "❌");
    console.log("Performance tests:", ctrPerformancePassed ? "✅" : "❌");
    console.log("GCM compatibility:", ctrGCMCompatPassed ? "✅" : "❌");

    const allPassed =
      ctrEncryptPassed &&
      ctrDecryptPassed &&
      ctrEdgeCasesPassed &&
      ctrCounterPassed &&
      ctrPerformancePassed &&
      ctrGCMCompatPassed;

    console.log(
      "CTR Mode Overall:",
      allPassed ? "🎉 All CTR tests passed!" : "⚠️  CTR issues need debugging",
    );

    return allPassed;
  }

  /**
   * Test GCM encryption for all AES variants
   */
  static testGCMEncrypt(): boolean {
    console.log(
      "\n=== Node.js crypto module AES GCM encryption verification ===",
    );

    let allPassed = true;

    // Test data
    const plaintext = AESUtils.stringToBytes("Test message");
    const iv = AESUtils.base64ToBytes("YjgZJzfIXjAYvwt/");
    const keys = {
      128: AESUtils.base64ToBytes("qmpEWRQQ+w1hp6xFYkoXFQ=="), // 16 bytes
      192: AESUtils.base64ToBytes("qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XT"), // 24 bytes
      256: AESUtils.base64ToBytes(
        "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=",
      ), // 32 bytes
    };

    for (const [keySize, key] of Object.entries(keys)) {
      console.log(`\n--- AES-${keySize}-GCM ---`);

      const cipherName = `aes-${keySize}-gcm`;
      const cipher = createCipheriv(cipherName, key, iv) as CipherGCM;

      let expectedCiphertext = cipher.update(plaintext);
      expectedCiphertext = Buffer.concat([expectedCiphertext, cipher.final()]);
      const expectedAuthTag = cipher.getAuthTag();

      console.log("Node.js crypto:");
      console.log("  Ciphertext:", AESUtils.bytesToBase64(expectedCiphertext));
      console.log("  Auth tag:", AESUtils.bytesToBase64(expectedAuthTag));

      const result = AESGCM.encrypt(plaintext, key, iv);
      const ciphertextMatches = result.ciphertext.equals(expectedCiphertext);
      const authTagMatches = result.authTag.equals(expectedAuthTag);

      console.log("Our implementation:");
      console.log(
        "  Ciphertext:",
        AESUtils.bytesToBase64(result.ciphertext),
        ciphertextMatches ? "✅" : "❌",
      );
      console.log(
        "  Auth tag:",
        AESUtils.bytesToBase64(result.authTag),
        authTagMatches ? "✅" : "❌",
      );

      const variantPassed = ciphertextMatches && authTagMatches;
      allPassed = allPassed && variantPassed;
    }

    return allPassed;
  }

  /**
   * Test GCM decryption for all AES variants
   */
  static testGCMDecrypt(): boolean {
    console.log(
      "\n=== Node.js crypto module AES GCM decryption verification ===",
    );

    let allPassed = true;

    // Generate valid test vectors by first encrypting with Node.js crypto
    const testPlaintext = "Test message";
    const plaintextBytes = AESUtils.stringToBytes(testPlaintext);
    const iv = AESUtils.base64ToBytes("YjgZJzfIXjAYvwt/");

    const keys = [
      { size: 128, key: AESUtils.base64ToBytes("qmpEWRQQ+w1hp6xFYkoXFQ==") },
      {
        size: 192,
        key: AESUtils.base64ToBytes("qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XT"),
      },
      {
        size: 256,
        key: AESUtils.base64ToBytes(
          "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=",
        ),
      },
    ];

    for (const { size, key } of keys) {
      console.log(`\n--- AES-${size}-GCM ---`);

      // First encrypt with Node.js crypto to get valid test vector
      const cipherName = `aes-${size}-gcm`;
      const cipher = createCipheriv(cipherName, key, iv) as CipherGCM;

      let nodeCiphertext = cipher.update(plaintextBytes);
      nodeCiphertext = Buffer.concat([nodeCiphertext, cipher.final()]);
      const nodeAuthTag = cipher.getAuthTag();

      console.log("Node.js crypto created:");
      console.log("  Ciphertext:", AESUtils.bytesToBase64(nodeCiphertext));
      console.log("  Auth tag:", AESUtils.bytesToBase64(nodeAuthTag));

      // Now verify decryption with Node.js crypto
      const decipher = createDecipheriv(cipherName, key, iv) as DecipherGCM;
      decipher.setAuthTag(nodeAuthTag);

      let expectedPlaintext = decipher.update(nodeCiphertext);
      expectedPlaintext = Buffer.concat([expectedPlaintext, decipher.final()]);

      console.log("Node.js crypto decrypted:");
      console.log("  Plaintext:", AESUtils.bytesToString(expectedPlaintext));

      // Test our implementation
      const plaintext = AESGCM.decrypt(nodeCiphertext, key, iv, nodeAuthTag);
      const plaintextMatches = plaintext.equals(expectedPlaintext);

      console.log("Our implementation:");
      console.log(
        "  Plaintext:",
        AESUtils.bytesToString(plaintext),
        plaintextMatches ? "✅" : "❌",
      );

      allPassed = allPassed && plaintextMatches;
    }

    return allPassed;
  }

  /**
   * Test round trip for all AES variants
   */
  static testGCMRoundTrip(): boolean {
    console.log("\n=== AES GCM encryption-decryption round trip test ===");

    let allPassed = true;
    const originalText = "Hello, AES-GCM World! 🔒";
    console.log("Original text:", originalText);

    const keySizes: AESKeySize[] = [128, 192, 256];

    for (const keySize of keySizes) {
      console.log(`\n📋 Test AES-${keySize} Round Trip`);

      try {
        // Test 1: Standard 12-byte IV
        const config = AES_CONFIGS[keySize];
        const key = AESUtils.randomBytes(config.keyLength);
        const iv = AESUtils.randomBytes(12);
        const plaintext = AESUtils.stringToBytes(originalText);

        const encrypted = AESGCM.encrypt(plaintext, key, iv);
        console.log("  Encryption successful ✅");

        const decrypted = AESGCM.decrypt(
          encrypted.ciphertext,
          key,
          iv,
          encrypted.authTag,
        );
        const decryptedText = AESUtils.bytesToString(decrypted);
        const success = decryptedText === originalText;

        console.log("  Decryption result:", decryptedText);
        console.log("  Round trip successful:", success ? "✅" : "❌");

        allPassed = allPassed && success;

        // Test 2: Easy interface
        const easyEncrypted = AESGCMEasy.encrypt(
          originalText,
          undefined,
          undefined,
          keySize,
        );
        console.log(`  Easy ${easyEncrypted.variant} encryption successful ✅`);

        const easyDecrypted = AESGCMEasy.decryptResult(easyEncrypted);
        const easySuccess = easyDecrypted === originalText;
        console.log("  Easy decryption result:", easyDecrypted);
        console.log("  Easy round trip successful:", easySuccess ? "✅" : "❌");

        allPassed = allPassed && easySuccess;
      } catch (error) {
        console.log(`  AES-${keySize} failed:`, String(error), "❌");
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Test authentication failure detection for all variants
   */
  static testAuthenticationFailure(): boolean {
    console.log("\n=== Authentication failure test ===");

    let allPassed = true;
    const originalText = "Secret message";
    const keySizes: AESKeySize[] = [128, 192, 256];

    for (const keySize of keySizes) {
      console.log(`\n📋 Test AES-${keySize} Authentication`);

      const config = AES_CONFIGS[keySize];
      const key = AESUtils.randomBytes(config.keyLength);
      const iv = AESUtils.randomBytes(12);
      const plaintext = AESUtils.stringToBytes(originalText);

      const encrypted = AESGCM.encrypt(plaintext, key, iv);

      // Test 1: Wrong authentication tag
      const wrongAuthTag = Buffer.from(encrypted.authTag);
      wrongAuthTag[0] ^= 0x01; // Modify one bit

      try {
        AESGCM.decrypt(encrypted.ciphertext, key, iv, wrongAuthTag);
        console.log("  Should have failed but didn't ❌");
        allPassed = false;
      } catch {
        console.log("  Correctly detected auth failure ✅");
      }

      // Test 2: Modified ciphertext
      const wrongCiphertext = Buffer.from(encrypted.ciphertext);
      if (wrongCiphertext.length > 0) {
        wrongCiphertext[0] ^= 0x01; // Modify one bit
      }

      try {
        AESGCM.decrypt(wrongCiphertext, key, iv, encrypted.authTag);
        console.log("  Should have failed but didn't ❌");
        allPassed = false;
      } catch {
        console.log("  Correctly detected modification ✅");
      }
    }

    return allPassed;
  }

  /**
   * Run all verification tests
   */
  static runAllTests(): boolean {
    console.log(
      "🧪 Starting comprehensive AES verification with CTR mode...\n",
    );

    // Original tests
    const ecbPassed = AESVerification.testECBEncrypt();
    const gcmEncryptPassed = AESVerification.testGCMEncrypt();
    const gcmDecryptPassed = AESVerification.testGCMDecrypt();
    const roundTripPassed = AESVerification.testGCMRoundTrip();
    const authFailPassed = AESVerification.testAuthenticationFailure();

    // New CTR mode tests
    const ctrPassed = this.runAllCTRTests();

    console.log("\n📊 Complete Test Summary:");
    console.log("ECB mode encryption:", ecbPassed ? "✅" : "❌");
    console.log("GCM mode encryption:", gcmEncryptPassed ? "✅" : "❌");
    console.log("GCM mode decryption:", gcmDecryptPassed ? "✅" : "❌");
    console.log("Round trip tests:", roundTripPassed ? "✅" : "❌");
    console.log("Authentication tests:", authFailPassed ? "✅" : "❌");
    console.log("CTR mode tests:", ctrPassed ? "✅" : "❌");

    const allPassed =
      ecbPassed &&
      gcmEncryptPassed &&
      gcmDecryptPassed &&
      roundTripPassed &&
      authFailPassed &&
      ctrPassed;

    console.log(
      "Overall status:",
      allPassed ? "🎉 All tests passed!" : "⚠️  Issues need debugging",
    );

    return allPassed;
  }
}

if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  process.argv[1].endsWith("aes-gcm.ts")
) {
  AESVerification.runAllTests();
  // const plaintext = Buffer.from([
  //   123, 10, 32, 32, 34, 116, 101, 115, 116, 97, 116, 111, 114, 34, 58, 32, 34,
  //   48, 120, 48, 52, 49, 70, 53, 55, 99, 52, 52, 57, 50, 55, 54, 48, 97, 97, 69,
  //   52, 52, 69, 67, 101, 100, 50, 57, 98, 52, 57, 97, 51, 48, 68, 97, 65, 68,
  //   51, 68, 52, 67, 99, 34, 44, 10, 32, 32, 34, 101, 115, 116, 97, 116, 101,
  //   115, 34, 58, 32, 91, 10, 32, 32, 32, 32, 123, 10, 32, 32, 32, 32, 32, 32,
  //   34, 98, 101, 110, 101, 102, 105, 99, 105, 97, 114, 121, 34, 58, 32, 34, 48,
  //   120, 51, 102, 70, 49, 70, 56, 50, 54, 69, 49, 49, 56, 48, 100, 49, 53, 49,
  //   50, 48, 48, 65, 52, 100, 53, 52, 51, 49, 97, 51, 65, 97, 51, 49, 52, 50, 67,
  //   52, 65, 56, 99, 34, 44, 10, 32, 32, 32, 32, 32, 32, 34, 116, 111, 107, 101,
  //   110, 34, 58, 32, 34, 48, 120, 55, 53, 102, 97, 102, 49, 49, 52, 101, 97,
  //   102, 98, 49, 66, 68, 98, 101, 50, 70, 48, 51, 49, 54, 68, 70, 56, 57, 51,
  //   102, 100, 53, 56, 67, 69, 52, 54, 65, 65, 52, 100, 34, 44, 10, 32, 32, 32,
  //   32, 32, 32, 34, 97, 109, 111, 117, 110, 116, 34, 58, 32, 49, 48, 48, 48, 10,
  //   32, 32, 32, 32, 125, 44, 10, 32, 32, 32, 32, 123, 10, 32, 32, 32, 32, 32,
  //   32, 34, 98, 101, 110, 101, 102, 105, 99, 105, 97, 114, 121, 34, 58, 32, 34,
  //   48, 120, 51, 102, 70, 49, 70, 56, 50, 54, 69, 49, 49, 56, 48, 100, 49, 53,
  //   49, 50, 48, 48, 65, 52, 100, 53, 52, 51, 49, 97, 51, 65, 97, 51, 49, 52, 50,
  //   67, 52, 65, 56, 99, 34, 44, 10, 32, 32, 32, 32, 32, 32, 34, 116, 111, 107,
  //   101, 110, 34, 58, 32, 34, 48, 120, 98, 49, 68, 52, 53, 51, 56, 66, 52, 53,
  //   55, 49, 100, 52, 49, 49, 70, 48, 55, 57, 54, 48, 69, 70, 50, 56, 51, 56, 67,
  //   101, 51, 51, 55, 70, 69, 49, 69, 56, 48, 69, 34, 44, 10, 32, 32, 32, 32, 32,
  //   32, 34, 97, 109, 111, 117, 110, 116, 34, 58, 32, 53, 48, 48, 48, 48, 48, 48,
  //   10, 32, 32, 32, 32, 125, 10, 32, 32, 93, 44, 10, 32, 32, 34, 115, 97, 108,
  //   116, 34, 58, 32, 49, 54, 51, 48, 54, 51, 49, 56, 54, 51, 55, 56, 55, 52, 49,
  //   54, 44, 10, 32, 32, 34, 119, 105, 108, 108, 34, 58, 32, 34, 48, 120, 57, 52,
  //   56, 52, 55, 56, 49, 57, 102, 99, 100, 69, 97, 67, 51, 56, 54, 49, 53, 50,
  //   101, 97, 100, 51, 97, 67, 48, 53, 51, 56, 69, 56, 54, 102, 97, 98, 52, 98,
  //   66, 56, 34, 44, 10, 32, 32, 34, 116, 105, 109, 101, 115, 116, 97, 109, 112,
  //   34, 58, 32, 34, 50, 48, 50, 53, 45, 48, 54, 45, 50, 57, 84, 48, 50, 58, 48,
  //   51, 58, 49, 56, 46, 51, 50, 50, 90, 34, 44, 10, 32, 32, 34, 109, 101, 116,
  //   97, 100, 97, 116, 97, 34, 58, 32, 123, 32, 34, 112, 114, 101, 100, 105, 99,
  //   116, 101, 100, 65, 116, 34, 58, 32, 49, 55, 53, 49, 49, 54, 50, 53, 57, 56,
  //   51, 50, 50, 44, 32, 34, 101, 115, 116, 97, 116, 101, 115, 67, 111, 117, 110,
  //   116, 34, 58, 32, 50, 32, 125, 44, 10, 32, 32, 34, 115, 105, 103, 110, 97,
  //   116, 117, 114, 101, 34, 58, 32, 123, 10, 32, 32, 32, 32, 34, 110, 111, 110,
  //   99, 101, 34, 58, 32, 53, 49, 56, 52, 48, 48, 55, 51, 55, 48, 51, 53, 55, 56,
  //   57, 44, 10, 32, 32, 32, 32, 34, 100, 101, 97, 100, 108, 105, 110, 101, 34,
  //   58, 32, 49, 55, 56, 50, 54, 57, 56, 53, 57, 57, 44, 10, 32, 32, 32, 32, 34,
  //   115, 105, 103, 110, 97, 116, 117, 114, 101, 34, 58, 32, 34, 48, 120, 56, 98,
  //   98, 99, 54, 49, 100, 54, 49, 56, 100, 54, 97, 48, 57, 99, 98, 48, 97, 102,
  //   98, 99, 100, 54, 50, 57, 101, 56, 51, 102, 97, 97, 56, 102, 101, 52, 49,
  //   101, 50, 101, 101, 48, 100, 52, 53, 51, 52, 55, 50, 50, 52, 54, 51, 50, 57,
  //   57, 51, 57, 49, 53, 99, 56, 100, 48, 51, 55, 49, 55, 48, 50, 100, 51, 101,
  //   52, 48, 53, 56, 101, 53, 48, 56, 51, 56, 48, 48, 53, 99, 54, 98, 48, 53, 97,
  //   97, 101, 48, 97, 54, 101, 50, 56, 98, 100, 99, 50, 52, 55, 48, 57, 50, 53,
  //   54, 53, 102, 97, 56, 48, 52, 53, 98, 97, 97, 102, 48, 102, 52, 48, 53, 98,
  //   49, 99, 34, 10, 32, 32, 125, 10, 125, 10,
  // ]);
  // const key = Buffer.from([
  //   170, 106, 68, 89, 20, 16, 251, 13, 97, 167, 172, 69, 98, 74, 23, 21, 65,
  //   217, 3, 195, 172, 239, 85, 211, 91, 16, 217, 33, 211, 64, 75, 186
  // ]);
  // const iv = Buffer.from([
  //   78, 10, 92, 203, 149, 108, 165, 113, 153, 123, 11, 3, 71, 95, 122, 2,
  // ]);
  // const ciphertext = Array.from(AESGCM.ctrEncrypt(plaintext, key, iv));
  // for (const byte of ciphertext) {
  //   console.log(`${byte},`);
  // }
}

export {
  AESUtils,
  AESSbox,
  GaloisField,
  AESTransforms,
  AESKeyExpansion,
  AES,
  GF128,
  AESGCM,
  AESGCMEasy,
  AESVerification,
};
