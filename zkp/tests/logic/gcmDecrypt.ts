import { Byte, Word } from "../type/index.js";
import { AESGCM } from "./cryptography/aes-gcm.js";
import { wordToBuffer } from "../util/index.js";

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

export { gcmDecrypt };
