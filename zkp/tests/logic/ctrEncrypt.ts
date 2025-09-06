import { Word, Byte, Byte16 } from "../type/index.js";
import { AESGCM } from "./modules/aesGcm.js";
import { wordToBuffer } from "../util/index.js";

function ctrEncrypt(plaintext: Byte[], key: Word[], j0: Byte16): Byte[] {
  const plaintextBuffer = Buffer.from(plaintext);
  const keyBuffer = wordToBuffer(key);
  const j0Buffer = Buffer.from(j0);

  const ciphertextBuffer = AESGCM.ctrEncrypt(
    plaintextBuffer,
    keyBuffer,
    j0Buffer,
  );
  return Array.from(ciphertextBuffer) as Byte[];
}

export { ctrEncrypt };
