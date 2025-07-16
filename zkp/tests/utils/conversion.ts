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

export { byteToWord, wordToByte };
