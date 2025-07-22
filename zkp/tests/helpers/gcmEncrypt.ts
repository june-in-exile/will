import { wordToBuffer } from "../utils";
import { AESGCM } from "./aes-gcm";

function gcmEncrypt(plaintext: Byte[], key: Word[], iv: Byte[], aad: Byte[]): { ciphertext: Byte[], authTag: Byte[] } {
  const plaintextBuffer = Buffer.from(plaintext);
  const keyBuffer = wordToBuffer(key);
  const ivBuffer = Buffer.from(iv);
  const additionalData = Buffer.from(aad);

  const { ciphertext, authTag } = AESGCM.encrypt(
    plaintextBuffer,
    keyBuffer,
    ivBuffer,
    additionalData
  );
  return { ciphertext: Array.from(ciphertext) as Byte[], authTag: Array.from(authTag) as Byte[] };
}

export { gcmEncrypt };
