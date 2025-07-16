import { AES } from "./aes-gcm";
import { wordToByte } from "../utils";

function encryptBlock(plaintext: Byte16, key: Word[]): Byte16 {
  const plaintextBuffer = Buffer.from(plaintext);
  const keyBuffer = Buffer.from(wordToByte(key));

  const ciphertextBuffer = AES.encryptBlock(plaintextBuffer, keyBuffer);
  const ciphertext = Array.from(ciphertextBuffer);

  return ciphertext as Byte16;
}

export { encryptBlock };
