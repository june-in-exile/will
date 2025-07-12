import { AESKeyExpansion } from "./aes256gcm";

function expandKey(key: Word[]): Word[] {
  const keyBuffer = Buffer.concat(key.map((w) => Buffer.from(w.bytes)));
  const expanded = AESKeyExpansion.expandKey(keyBuffer);
  const expandedKey = expanded.flatMap((buf) => Array.from(buf)) as Byte[];

  const words: Word[] = [];
  for (let i = 0; i < expandedKey.length; i += 4) {
    words.push({ bytes: expandedKey.slice(i, i + 4) as Byte4 });
  }

  return words;
}

export { expandKey };
