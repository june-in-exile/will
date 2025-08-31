import { Word, Byte } from "../type/index.js";
import { AESGCM } from "./aes-gcm.js";
import { wordToBuffer } from "../util/index.js";

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

export { gcmEncrypt, gcmDecrypt };
