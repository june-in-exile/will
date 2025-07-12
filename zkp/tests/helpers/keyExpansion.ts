import { AESKeyExpansion } from "./aes256gcm";
import { Word } from "../types";

// TODO: Update this code snippet after the JSON format is fixed.
// function expandKey(key: Word[]): Word[] {
//     const keyBytes = Buffer.concat(key.map(keyWord => Buffer.from(keyWord.bytes)));

// const expandedKey = AESKeyExpansion.expandKey(keyBytes);

// const flattenedBytes = expandedKey.flatMap(buf => Array.from(buf));

// const words: Word[] = [];
// for (let i = 0; i < flattenedBytes.length; i += 4) {
//     const group = flattenedBytes.slice(i, i + 4);
//     if (group.length !== 4) {
//         throw new Error(`Invalid group of bytes at index ${i}: ${group}`);
//     }
//     words.push({ bytes: group as [number, number, number, number] });
// }

// return words;
// }
function expandKey(key: number[]): Word[] {
  const keyBytes = Buffer.from(key);

  const expandedKey = AESKeyExpansion.expandKey(keyBytes);

  const flattenedBytes = expandedKey.flatMap((buf) => Array.from(buf));

  const words: Word[] = [];
  for (let i = 0; i < flattenedBytes.length; i += 4) {
    const group = flattenedBytes.slice(i, i + 4);
    if (group.length !== 4) {
      throw new Error(`Invalid group of bytes at index ${i}: ${group}`);
    }
    words.push({ bytes: group as [number, number, number, number] });
  }

  return words;
}

export { expandKey };
