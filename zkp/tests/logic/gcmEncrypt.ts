import { Byte, Byte12, Byte16, Word } from "../type/index.js";
import { AESGCM } from "./aes-gcm.js";
import { wordToBuffer } from "../util/index.js";

function computeJ0Standard(iv: Byte12): Byte16 {
  const ivBuffer = Buffer.from(iv);
  const hashKey = Buffer.alloc(16); // This won't be used

  const j0Buffer = AESGCM.computeJ0(ivBuffer, hashKey);
  return Array.from(j0Buffer) as Byte16;
}

function computeJ0NonStandard(iv: Byte[], hashKey: Byte16): Byte16 {
  const ivBuffer = Buffer.from(iv);
  const hashKeyBuffer = Buffer.from(hashKey);

  const j0Buffer = AESGCM.computeJ0(ivBuffer, hashKeyBuffer);
  return Array.from(j0Buffer) as Byte16;
}
  
function gcmEncrypt(
  plaintext: Byte[],
  key: Word[],
  iv: Byte[],
  aad: Byte[],
): { ciphertext: Byte[]; authTag: Byte[] } {
  const plaintextBuffer = Buffer.from(plaintext);
  const keyBuffer = wordToBuffer(key);
  const ivBuffer = Buffer.from(iv);
  const aadBuffer = Buffer.from(aad);

  const { ciphertext, authTag } = AESGCM.encrypt(
    plaintextBuffer,
    keyBuffer,
    ivBuffer,
    aadBuffer,
  );
  return {
    ciphertext: Array.from(ciphertext) as Byte[],
    authTag: Array.from(authTag) as Byte[],
  };
}

function gcmDecrypt(
  ciphertext: Byte[],
  key: Word[],
  iv: Byte[],
  authTag: Byte[],
  aad: Byte[],
): { plaintext: Byte[] } {
  const ciphertextBuffer = Buffer.from(ciphertext);
  const keyBuffer = wordToBuffer(key);
  const ivBuffer = Buffer.from(iv);
  const authTagBuffer = Buffer.from(authTag);
  const aadBuffer = Buffer.from(aad);

  const { plaintext } = AESGCM.decrypt(
    ciphertextBuffer,
    keyBuffer,
    ivBuffer,
    authTagBuffer,
    aadBuffer,
  );
  return {
    plaintext: Array.from(plaintext) as Byte[],
  };
}

export { computeJ0Standard, computeJ0NonStandard, gcmEncrypt, gcmDecrypt };