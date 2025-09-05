import { Byte, Word } from "../type/index.js";
import { AESGCM } from "./cryptography/aes-gcm.js";
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

export { gcmEncrypt };
