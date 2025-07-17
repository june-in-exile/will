import { wordToBuffer } from "../utils";
import { AESGCM } from "./aes-gcm";

function ctrEncrypt(plaintext: Byte[], key: Word[], j0: Byte16, numBlocks: number): Byte[] {
    const slicedPlaintext = plaintext.slice(0, numBlocks * 16);
    const slicedPlaintextBuffer = Buffer.from(slicedPlaintext);
    const keyBuffer = wordToBuffer(key);
    const j0Buffer = Buffer.from(j0);

    const slicedCiphertextBuffer = AESGCM.ctrEncrypt(slicedPlaintextBuffer, keyBuffer, j0Buffer);
    const slicedCiphertext = Array.from(slicedCiphertextBuffer);
    const ciphertext = slicedCiphertext.concat(plaintext.slice(numBlocks * 16));

    return ciphertext as Byte[];
}

export { ctrEncrypt };
