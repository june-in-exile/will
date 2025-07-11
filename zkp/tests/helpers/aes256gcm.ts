/**
 * AES-256-GCM TypeScript Implementation (Fixed Version - Supports Arbitrary Length IV)
 */

import { createCipheriv, createDecipheriv } from "crypto";

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

    result[0] = state[0];
    result[4] = state[4];
    result[8] = state[8];
    result[12] = state[12];

    result[1] = state[5];
    result[5] = state[9];
    result[9] = state[13];
    result[13] = state[1];

    result[2] = state[10];
    result[6] = state[14];
    result[10] = state[2];
    result[14] = state[6];

    result[3] = state[15];
    result[7] = state[3];
    result[11] = state[7];
    result[15] = state[11];

    return result;
  }

  static mixColumns(state: Buffer): Buffer {
    const result = Buffer.alloc(16);

    for (let col = 0; col < 4; col++) {
      const offset = col * 4;

      const s0 = state[offset];
      const s1 = state[offset + 1];
      const s2 = state[offset + 2];
      const s3 = state[offset + 3];

      result[offset] =
        GaloisField.fastMul2(s0) ^ GaloisField.fastMul3(s1) ^ s2 ^ s3;
      result[offset + 1] =
        s0 ^ GaloisField.fastMul2(s1) ^ GaloisField.fastMul3(s2) ^ s3;
      result[offset + 2] =
        s0 ^ s1 ^ GaloisField.fastMul2(s2) ^ GaloisField.fastMul3(s3);
      result[offset + 3] =
        GaloisField.fastMul3(s0) ^ s1 ^ s2 ^ GaloisField.fastMul2(s3);
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

  static expandKey(key: Buffer): Buffer[] {
    if (key.length !== 32) {
      throw new Error("AES-256 requires a 32-byte key");
    }

    const roundKeys: Buffer[] = [];
    const expandedKey = Buffer.alloc(240);

    key.copy(expandedKey, 0);

    for (let i = 32; i < 240; i += 4) {
      const prevWord = expandedKey.subarray(i - 4, i);
      let newWord: Buffer;

      if (i % 32 === 0) {
        const rotated = this.rotWord(prevWord);
        const substituted = this.subWord(rotated);
        const rconValue = Buffer.from([this.RCON[i / 32 - 1], 0, 0, 0]);
        newWord = AESUtils.xor(substituted, rconValue);
      } else if (i % 32 === 16) {
        newWord = this.subWord(prevWord);
      } else {
        newWord = Buffer.from(prevWord);
      }

      const prevRoundWord = expandedKey.subarray(i - 32, i - 28);
      const finalWord = AESUtils.xor(newWord, prevRoundWord);
      finalWord.copy(expandedKey, i);
    }

    for (let round = 0; round < 15; round++) {
      roundKeys.push(expandedKey.subarray(round * 16, (round + 1) * 16));
    }

    return roundKeys;
  }
}

class AES256 {
  static encryptBlock(plaintext: Buffer, key: Buffer): Buffer {
    if (plaintext.length !== 16) {
      throw new Error("Plaintext must be exactly 16 bytes");
    }

    const roundKeys = AESKeyExpansion.expandKey(key);
    let state = Buffer.from(plaintext);

    state = AESTransforms.addRoundKey(state, roundKeys[0]);

    for (let round = 1; round <= 13; round++) {
      state = AESTransforms.subBytes(state);
      state = AESTransforms.shiftRows(state);
      state = AESTransforms.mixColumns(state);
      state = AESTransforms.addRoundKey(state, roundKeys[round]);
    }

    state = AESTransforms.subBytes(state);
    state = AESTransforms.shiftRows(state);
    state = AESTransforms.addRoundKey(state, roundKeys[14]);

    return state;
  }
}

// GF(2^128) operations
class GF128 {
  // GF(2^128) multiplication using reduction polynomial f(x) = x^128 + x^7 + x^2 + x + 1
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

      // If there's a carry, subtract the reduction polynomial
      // f(x) = x^128 + x^7 + x^2 + x + 1 corresponds to 11100001 00000000 ... 00000000
      if (carry) {
        v[0] ^= 0xe1;
      }
    }

    return result;
  }
}

class AES256GCM {
  static incrementCounter(counter: Buffer): void {
    let carry = 1;
    for (let j = 15; j >= 12 && carry; j--) {
      const sum = counter[j] + carry;
      counter[j] = sum & 0xff;
      carry = sum >> 8;
    }
  }

  static ctrEncrypt(plaintext: Buffer, key: Buffer, j0: Buffer): Buffer {
    const numBlocks = Math.ceil(plaintext.length / 16);
    const ciphertext = Buffer.alloc(plaintext.length);

    const counter = Buffer.from(j0);

    for (let i = 0; i < numBlocks; i++) {
      // Increment counter (only last 4 bytes)
      this.incrementCounter(counter);

      // Encrypt current counter
      const keystream = AES256.encryptBlock(counter, key);

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

  static encrypt(
    plaintext: Buffer,
    key: Buffer,
    iv: Buffer,
    additionalData: Buffer = Buffer.alloc(0),
  ): { ciphertext: Buffer; authTag: Buffer } {
    if (key.length !== 32) {
      throw new Error("AES-256-GCM requires a 32-byte key");
    }

    // 1. Generate hash subkey: H = CIPH_K(0^128)
    const zeroBlock = Buffer.alloc(16);
    const hashKey = AES256.encryptBlock(zeroBlock, key);

    // 2. Compute J0 (supports arbitrary length IV)
    const j0 = this.computeJ0(iv, hashKey);

    // 3. CTR mode encryption
    const ciphertext = this.ctrEncrypt(plaintext, key, j0);

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
    const tagMask = AES256.encryptBlock(j0, key);
    S = AESUtils.xor(S, tagMask);

    // 7. Return ciphertext and tag
    return { ciphertext, authTag: S };
  }

  /**
   * AES-256-GCM decryption function
   * @param ciphertext Ciphertext
   * @param key 32-byte key
   * @param iv Initialization vector (arbitrary length)
   * @param authTag Authentication tag (16 bytes)
   * @param additionalData Additional authenticated data (optional)
   * @returns Decrypted plaintext
   * @throws Error if authentication fails
   */
  static decrypt(
    ciphertext: Buffer,
    key: Buffer,
    iv: Buffer,
    authTag: Buffer,
    additionalData: Buffer = Buffer.alloc(0),
  ): Buffer {
    // 1. Key and authentication tag must be specified lengths
    if (key.length !== 32) {
      throw new Error("AES-256-GCM requires a 32-byte key");
    }
    if (authTag.length !== 16) {
      throw new Error("Authentication tag must be 16 bytes");
    }

    // 2. Generate hash subkey: H = CIPH_K(0^128)
    const zeroBlock = Buffer.alloc(16);
    const hashKey = AES256.encryptBlock(zeroBlock, key);

    // 3. Compute J0 (supports arbitrary length IV)
    const j0 = this.computeJ0(iv, hashKey);

    // 4. CTR mode decryption (same as encryption since XOR is symmetric)
    const plaintext = this.ctrEncrypt(ciphertext, key, j0);

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
    let S = this.ghash(authData, hashKey);

    // 7. Final tag calculation: T = GCTR_K(J0, S) = S xor CIPH_K(J0)
    const tagMask = AES256.encryptBlock(j0, key);
    const expectedAuthTag = AESUtils.xor(S, tagMask);

    // 8. Verify authentication tag and return plaintext
    if (!expectedAuthTag.equals(authTag)) {
      throw new Error("Authentication failed: Invalid authentication tag");
    }

    return plaintext;
  }

  /**
   * Decrypt with given additional authenticated data (including AAD)
   */
  static decryptWithAAD(
    ciphertext: Buffer,
    key: Buffer,
    iv: Buffer,
    authTag: Buffer,
    additionalData: Buffer,
  ): Buffer {
    return this.decrypt(ciphertext, key, iv, authTag, additionalData);
  }
}

class AES256GCMEasy {
  static encrypt(
    plaintext: string,
    keyBase64?: string,
    ivBase64?: string,
  ): { key: string; iv: string; ciphertext: string; authTag: string } {
    const keyBytes = keyBase64
      ? AESUtils.base64ToBytes(keyBase64)
      : AESUtils.randomBytes(32);
    const ivBytes = ivBase64
      ? AESUtils.base64ToBytes(ivBase64)
      : AESUtils.randomBytes(12);
    const plaintextBytes = AESUtils.stringToBytes(plaintext);

    const result = AES256GCM.encrypt(plaintextBytes, keyBytes, ivBytes);

    return {
      key: AESUtils.bytesToBase64(keyBytes),
      iv: AESUtils.bytesToBase64(ivBytes),
      ciphertext: AESUtils.bytesToBase64(result.ciphertext),
      authTag: AESUtils.bytesToBase64(result.authTag),
    };
  }

  static encryptBlock(
    plaintext: string,
    keyBase64: string,
  ): { key: string; plaintext: string; ciphertext: string } {
    const keyBytes = AESUtils.base64ToBytes(keyBase64);
    const plaintextBytes = AESUtils.stringToBytes(plaintext);

    const paddedPlaintext = Buffer.alloc(16);
    plaintextBytes.subarray(0, 16).copy(paddedPlaintext);

    const ciphertext = AES256.encryptBlock(paddedPlaintext, keyBytes);

    return {
      key: keyBase64,
      plaintext: plaintext,
      ciphertext: AESUtils.bytesToBase64(ciphertext),
    };
  }

  /**
   * Simple string decryption interface
   * @param ciphertextBase64 Base64 encoded ciphertext
   * @param keyBase64 Base64 encoded key
   * @param ivBase64 Base64 encoded IV
   * @param authTagBase64 Base64 encoded authentication tag
   * @returns Decrypted string
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

    const plaintext = AES256GCM.decrypt(ciphertext, key, iv, authTag);
    return AESUtils.bytesToString(plaintext);
  }

  /**
   * Decrypt encryption result object
   * @param encryptedData Object returned by encrypt method
   * @returns Original string
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
  static testECBEncrypt(): boolean {
    console.log(
      "\n=== Node.js crypto module AES-256-ECB encryption verification ===",
    );

    const plaintext = AESUtils.stringToBytes("This is a secret");
    const key = AESUtils.base64ToBytes(
      "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=",
    );

    const cipher = createCipheriv("aes-256-ecb", key, null);
    cipher.setAutoPadding(false);

    let expectedCiphertext = cipher.update(plaintext);
    expectedCiphertext = Buffer.concat([expectedCiphertext, cipher.final()]);
    console.log("Node.js crypto:", AESUtils.bytesToBase64(expectedCiphertext));

    const ourCiphertext = AES256.encryptBlock(plaintext, key);
    const isEqual = ourCiphertext.equals(expectedCiphertext);

    console.log(
      "Our implementation:",
      AESUtils.bytesToBase64(ourCiphertext),
      isEqual ? "✅" : "❌",
    );

    return isEqual;
  }

  static testGCMEncrypt(): boolean {
    console.log(
      "\n=== Node.js crypto module AES-256-GCM encryption verification ===",
    );

    const plaintext = AESUtils.stringToBytes("Text");
    const key = AESUtils.base64ToBytes(
      "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=",
    );
    const iv = AESUtils.base64ToBytes("YjgZJzfIXjAYvwt/");

    const cipher = createCipheriv("aes-256-gcm", key, iv);

    let expectedCiphertext = cipher.update(plaintext);
    expectedCiphertext = Buffer.concat([expectedCiphertext, cipher.final()]);
    const expectedAuthTag = cipher.getAuthTag();

    console.log("\nNode.js crypto:");
    console.log(
      "Ciphertext (base64):",
      AESUtils.bytesToBase64(expectedCiphertext),
    );
    console.log("Auth tag (base64):", AESUtils.bytesToBase64(expectedAuthTag));

    const result = AES256GCM.encrypt(plaintext, key, iv);
    const ciphertextMatches = result.ciphertext.equals(expectedCiphertext);
    const authTagMatches = result.authTag.equals(expectedAuthTag);

    console.log("\nOur implementation:");
    console.log(
      "Ciphertext (base64):",
      AESUtils.bytesToBase64(result.ciphertext),
      ciphertextMatches ? "✅" : "❌",
    );
    console.log(
      "Auth tag (base64):",
      AESUtils.bytesToBase64(result.authTag),
      authTagMatches ? "✅" : "❌",
    );

    return ciphertextMatches && authTagMatches;
  }

  static testGCMDecrypt(): boolean {
    console.log(
      "\n=== Node.js crypto module AES-256-GCM decryption verification ===",
    );

    const ciphertext = AESUtils.base64ToBytes("PgG52g==");
    const key = AESUtils.base64ToBytes(
      "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=",
    );
    const iv = AESUtils.base64ToBytes("YjgZJzfIXjAYvwt/");
    const authTag = AESUtils.base64ToBytes("u1NxL5uXKyM/8qbZiBtUvQ==");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);

    decipher.setAuthTag(authTag);

    let expectedPlaintext = decipher.update(ciphertext);
    expectedPlaintext = Buffer.concat([expectedPlaintext, decipher.final()]);

    console.log("\nNode.js crypto:");
    console.log("Plaintext:", AESUtils.bytesToString(expectedPlaintext));

    const plaintext = AES256GCM.decrypt(ciphertext, key, iv, authTag);
    const plaintextMatches = plaintext.equals(expectedPlaintext);

    console.log("\nOur implementation:");
    console.log(
      "Plaintext:",
      AESUtils.bytesToString(plaintext),
      plaintextMatches ? "✅" : "❌",
    );

    return plaintextMatches;
  }

  /**
   * Test GCM mode encryption-decryption round trip
   */
  static testGCMRoundTrip(): boolean {
    console.log("\n=== AES-256-GCM encryption-decryption round trip test ===");

    const originalText = "Hello, AES-256-GCM World! 🔒";
    console.log("Original text:", originalText);

    // Test 1: Standard 12-byte IV
    console.log("\n📋 Test 1: 12-byte IV");
    const key12 = AESUtils.randomBytes(32);
    const iv12 = AESUtils.randomBytes(12);
    const plaintext12 = AESUtils.stringToBytes(originalText);

    const encrypted12 = AES256GCM.encrypt(plaintext12, key12, iv12);
    console.log("Encryption successful ✅");

    try {
      const decrypted12 = AES256GCM.decrypt(
        encrypted12.ciphertext,
        key12,
        iv12,
        encrypted12.authTag,
      );
      const decryptedText12 = AESUtils.bytesToString(decrypted12);
      const success12 = decryptedText12 === originalText;
      console.log("Decryption result:", decryptedText12);
      console.log("Decryption successful:", success12 ? "✅" : "❌");
    } catch (error) {
      console.log("Decryption failed:", String(error), "❌");
      return false;
    }

    // Test 2: Non-standard length IV
    console.log("\n📋 Test 2: 16-byte IV");
    const key16 = AESUtils.randomBytes(32);
    const iv16 = AESUtils.randomBytes(16);
    const plaintext16 = AESUtils.stringToBytes(originalText);

    const encrypted16 = AES256GCM.encrypt(plaintext16, key16, iv16);
    console.log("Encryption successful ✅");

    try {
      const decrypted16 = AES256GCM.decrypt(
        encrypted16.ciphertext,
        key16,
        iv16,
        encrypted16.authTag,
      );
      const decryptedText16 = AESUtils.bytesToString(decrypted16);
      const success16 = decryptedText16 === originalText;
      console.log("Decryption result:", decryptedText16);
      console.log("Decryption successful:", success16 ? "✅" : "❌");
    } catch (error) {
      console.log("Decryption failed:", String(error), "❌");
      return false;
    }

    // Test 3: Simplified interface test
    console.log("\n📋 Test 3: Simplified interface");
    const easyEncrypted = AES256GCMEasy.encrypt(originalText);
    console.log("Simple encryption successful ✅");

    try {
      const easyDecrypted = AES256GCMEasy.decryptResult(easyEncrypted);
      const success3 = easyDecrypted === originalText;
      console.log("Decryption result:", easyDecrypted);
      console.log("Simple decryption successful:", success3 ? "✅" : "❌");
    } catch (error) {
      console.log("Simple decryption failed:", String(error), "❌");
      return false;
    }

    return true;
  }

  /**
   * Test authentication tag verification
   */
  static testAuthenticationFailure(): boolean {
    console.log("\n=== Authentication failure test ===");

    const originalText = "Secret message";
    const key = AESUtils.randomBytes(32);
    const iv = AESUtils.randomBytes(12);
    const plaintext = AESUtils.stringToBytes(originalText);

    const encrypted = AES256GCM.encrypt(plaintext, key, iv);

    // Test 1: Wrong authentication tag
    console.log("\n📋 Test 1: Modified authentication tag");
    const wrongAuthTag = Buffer.from(encrypted.authTag);
    wrongAuthTag[0] ^= 0x01; // Modify one bit

    try {
      AES256GCM.decrypt(encrypted.ciphertext, key, iv, wrongAuthTag);
      console.log("Should have failed but didn't ❌");
      return false;
    } catch (error) {
      console.log("Correctly detected authentication failure ✅");
    }

    // Test 2: Modified ciphertext
    console.log("\n📋 Test 2: Modified ciphertext");
    const wrongCiphertext = Buffer.from(encrypted.ciphertext);
    if (wrongCiphertext.length > 0) {
      wrongCiphertext[0] ^= 0x01; // Modify one bit
    }

    try {
      AES256GCM.decrypt(wrongCiphertext, key, iv, encrypted.authTag);
      console.log("Should have failed but didn't ❌");
      return false;
    } catch (error) {
      console.log("Correctly detected authentication failure ✅");
    }

    return true;
  }

  static runAllTests(): boolean {
    console.log("🧪 Starting AES-256-GCM verification...\n");

    const ecbPassed = this.testECBEncrypt();
    const gcmEncryptPassed = this.testGCMEncrypt();
    const gcmDecryptPassed = this.testGCMDecrypt();
    const roundTripPassed = this.testGCMRoundTrip();
    const authFailPassed = this.testAuthenticationFailure();

    console.log("\n📊 Test summary:");
    console.log("ECB mode encryption:", ecbPassed ? "✅" : "❌");
    console.log("GCM mode encryption:", gcmEncryptPassed ? "✅" : "❌");
    console.log("GCM mode decryption:", gcmDecryptPassed ? "✅" : "❌");
    console.log(
      "Encryption-decryption round trip:",
      roundTripPassed ? "✅" : "❌",
    );
    console.log("Authentication verification:", authFailPassed ? "✅" : "❌");

    const allPassed =
      ecbPassed &&
      gcmEncryptPassed &&
      gcmDecryptPassed &&
      roundTripPassed &&
      authFailPassed;
    console.log(
      "Overall status:",
      allPassed ? "🎉 All tests passed!" : "⚠️  Issues still need debugging",
    );

    return allPassed;
  }
}

// Usage examples
class AESGCMExample {
  static demonstrateUsage(): void {
    console.log("🔒 AES-256-GCM Usage Examples\n");

    // Example 1: Basic encryption and decryption
    console.log("=== Basic Usage ===");
    const message = "This is a confidential message! 🔐";
    const encrypted = AES256GCMEasy.encrypt(message);

    console.log("Original message:", message);
    console.log("Encryption result:");
    console.log("  Key:", encrypted.key);
    console.log("  IV:", encrypted.iv);
    console.log("  Ciphertext:", encrypted.ciphertext);
    console.log("  Auth tag:", encrypted.authTag);

    const decrypted = AES256GCMEasy.decryptResult(encrypted);
    console.log("Decryption result:", decrypted);
    console.log(
      "Verification:",
      message === decrypted ? "✅ Success" : "❌ Failed",
    );

    // Example 2: Using fixed key and IV
    console.log("\n=== Using Fixed Parameters ===");
    const fixedKey = "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=";
    const fixedIV = "YjgZJzfIXjAYvwt/";

    const encrypted2 = AES256GCMEasy.encrypt(message, fixedKey, fixedIV);
    const decrypted2 = AES256GCMEasy.decrypt(
      encrypted2.ciphertext,
      encrypted2.key,
      encrypted2.iv,
      encrypted2.authTag,
    );

    console.log(
      "Fixed parameter encryption-decryption:",
      message === decrypted2 ? "✅ Success" : "❌ Failed",
    );
  }
}

// If this file is executed directly, run examples
if (require.main === module) {
  AESVerification.runAllTests();
  console.log("\n" + "=".repeat(50) + "\n");
  AESGCMExample.demonstrateUsage();
}

export { AESUtils, AESSbox, GaloisField, AESTransforms, AESKeyExpansion, AES256, GF128, AES256GCM, AES256GCMEasy, AESVerification, AESGCMExample };