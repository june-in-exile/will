import { wordToBuffer } from "../utils";
import { AESGCM } from "./aes-gcm";

function ctrEncrypt(
  plaintext: Byte[],
  key: Word[],
  j0: Byte16,
  numBlocks: number,
): Byte[] {
  const plaintextBuffer = Buffer.from(plaintext);
  const keyBuffer = wordToBuffer(key);
  const j0Buffer = Buffer.from(j0);

  const ciphertextBuffer = AESGCM.ctrEncrypt(
    plaintextBuffer,
    keyBuffer,
    j0Buffer,
  );
  const ciphertext = Array.from(ciphertextBuffer);

  const reuslt: Byte[] = [];
  reuslt.push(...ciphertext.slice(0, numBlocks * 16) as Byte[]);
  reuslt.push(...plaintext.slice(numBlocks * 16) as Byte[]);

  return reuslt;
}

export { ctrEncrypt };
