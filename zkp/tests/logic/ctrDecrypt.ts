import { Word, Byte, Byte16 } from "../type/index.js";
import { AESGCM } from "./aes-gcm.js";
import { wordToBuffer } from "../util/index.js";

function ctrDecrypt(ciphertext: Byte[], key: Word[], j0: Byte16): Byte[] {
  const ciphertextBuffer = Buffer.from(ciphertext);
  const keyBuffer = wordToBuffer(key);
  const j0Buffer = Buffer.from(j0);

  const plaintextBuffer = AESGCM.ctrEncrypt(
    ciphertextBuffer,
    keyBuffer,
    j0Buffer,
  );
  return Array.from(plaintextBuffer) as Byte[];
}

export { ctrDecrypt };
