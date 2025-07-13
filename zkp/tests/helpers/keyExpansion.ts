import { byteToWord, wordToByte } from "../utils";
import { AESKeyExpansion } from "./aes-gcm";

function expandKey(key: Word[]): Word[] {
  const keyBytes =  wordToByte(key);
  const keyBuffer = Buffer.from(keyBytes);

  const roundKeyBuffer = AESKeyExpansion.expandKey(keyBuffer);
  const roundKey = roundKeyBuffer.flatMap((buf) => Array.from(buf)) as Byte[];
  const roundKeyWord = byteToWord(roundKey)

  return roundKeyWord;
}

export { expandKey };
