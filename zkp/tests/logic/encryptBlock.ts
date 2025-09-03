import { Byte, Byte4, Byte16, Word, Word4 } from "../type/index.js";
import { AES, AESKeyExpansion, AESSbox, AESTransforms } from "./aes-gcm.js";
import { byteToWord, wordToByte } from "../util/index.js";

function expandKey(key: Word[]): Word[] {
  const keyBytes = wordToByte(key);
  const keyBuffer = Buffer.from(keyBytes);

  const roundKeyBuffer = AESKeyExpansion.expandKey(keyBuffer);
  const roundKey = roundKeyBuffer.flatMap((buf) => Array.from(buf)) as Byte[];
  const roundKeyWord = byteToWord(roundKey);

  return roundKeyWord;
}
  
function subWord(_in: Word): Word {
  const substituted = substituteBytes(_in.bytes);
  return {
    bytes: substituted as Byte4,
  };
}

function subBytes(_in: Byte16): Byte16 {
  const substituted = substituteBytes(_in);
  return substituted as Byte16;
}

function substituteBytes(_in: Byte[]): Byte[] {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESSbox.substituteBytes(inBuffer);
  const _out = Array.from(outBuffer);
  return _out as Byte[];
}

function shiftRows(_in: Byte16): Byte16 {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESTransforms.shiftRows(inBuffer);
  const _out = Array.from(outBuffer);
  return _out as Byte16;
}

function mixColumn(_in: Byte4): Byte4 {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESTransforms.mixColumn(inBuffer);
  const _out = Array.from(outBuffer);
  return _out as Byte4;
}

function mixColumns(_in: Byte16): Byte16 {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESTransforms.mixColumns(inBuffer);
  const _out = Array.from(outBuffer);
  return _out as Byte16;
}

function addRoundKey(state: Byte16, roundKey: Word4): { out: Byte16 } {
  const stateBuffer = Buffer.from(state);
  const roundKeyBuffer = Buffer.from(wordToByte(roundKey));

  const outBuffer = AESTransforms.addRoundKey(stateBuffer, roundKeyBuffer);
  const out = Array.from(outBuffer);

  return { out: out as Byte16 };
}

function encryptBlock(plaintext: Byte16, key: Word[]): Byte16 {
  const plaintextBuffer = Buffer.from(plaintext);
  const keyBuffer = Buffer.from(wordToByte(key));

  const ciphertextBuffer = AES.encryptBlock(plaintextBuffer, keyBuffer);
  const ciphertext = Array.from(ciphertextBuffer);

  return ciphertext as Byte16;
}

export { expandKey, subWord, subBytes, substituteBytes, shiftRows, mixColumn, mixColumns, addRoundKey, encryptBlock };
