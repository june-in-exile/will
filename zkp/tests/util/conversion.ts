import { Byte, Byte4, Word } from "../type/index.js";

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

export { byteToWord, wordToByte, bufferToWord, wordToBuffer };
