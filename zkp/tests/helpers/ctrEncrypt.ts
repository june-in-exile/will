import { wordToBuffer } from "../utils";
import { AESGCM } from "./aes-gcm";

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
