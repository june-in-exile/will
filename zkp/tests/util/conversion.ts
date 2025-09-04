import { Bit, Byte, Byte4, Word } from "../type/index.js";

/**
 * @param bytes - Byte array (length should be a multiple of 4)
 * @returns Word[]
 */
function byteToWord(bytes: Byte[]): Word[] {
  if (bytes.length % 4 !== 0) {
    throw new Error("Length of keyBytes must be a multiple of 4");
  }
  const words: Word[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    const chunk = bytes.slice(i, i + 4);
    words.push({
      bytes: chunk as Byte4,
    });
  }
  return words;
}

/**
 * @param words - Word array
 * @returns Flattened Byte array
 */
function wordToByte(words: Word[]): Byte[] {
  const bytes: Byte[] = [];
  for (const word of words) {
    bytes.push(...word.bytes);
  }
  return bytes;
}

/**
 * @param buffer - Buffer of bytes (length should be a multiple of 4)
 * @returns Word[]
 */
function bufferToWord(buffer: Buffer): Word[] {
  if (buffer.length % 4 !== 0) {
    throw new Error("Length of buffer must be a multiple of 4");
  }
  const words: Word[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    const chunk = buffer.subarray(i, i + 4);
    words.push({
      bytes: Array.from(chunk) as Byte4,
    });
  }
  return words;
}

/**
 * @param words - Word array
 * @returns A Buffer containing the concatenated bytes
 */
function wordToBuffer(words: Word[]): Buffer {
  const byteArray: number[] = [];
  for (const word of words) {
    byteArray.push(...word.bytes);
  }
  return Buffer.from(byteArray);
}

/**
 * Convert hex string to bytes
 */
function hexToByte(hex: string): Byte[] {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;

  if (cleanHex.length % 2 !== 0) {
    throw new Error(`Hex string must have even length, got ${cleanHex.length}`);
  }

  const bytes = new Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes as Byte[];
}

/**
 * Convert bytes to hex string
 */
function byteToHex(bytes: Byte[]): string {
  return bytes
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert bytes to bits array (each byte becomes 8 bits)
 */
function byteToBit(bytes: Byte[]): Bit[] {
  const bits: Bit[] = [];
  
  for (const byte of bytes) {
    // Extract each bit from the byte (LSB first)
    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const bit = (byte >> bitIdx) & 1;
      bits.push(bit as Bit);
    }
  }
  
  return bits;
}

/**
 * Convert bits array to bytes (every 8 bits becomes 1 byte)
 */
function bitToByte(bits: Bit[]): Byte[] {
  if (bits.length % 8 !== 0) {
    throw new Error(
      `Bits array length must be multiple of 8, got ${bits.length}`
    );
  }
  
  // Validate that all values are 0 or 1
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== 0 && bits[i] !== 1) {
      throw new Error(
        `All bits must be 0 or 1, found ${bits[i]} at index ${i}`
      );
    }
  }
  
  const bytes: Byte[] = [];
  
  for (let byteIdx = 0; byteIdx < bits.length / 8; byteIdx++) {
    let byteValue = 0;
    
    // Combine 8 bits into a byte (LSB first)
    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const bit = bits[byteIdx * 8 + bitIdx];
      byteValue |= bit << bitIdx;
    }
    
    bytes.push(byteValue as Byte);
  }
  
  return bytes;
}

export { byteToWord, wordToByte, bufferToWord, wordToBuffer, hexToByte, byteToHex, byteToBit, bitToByte };
