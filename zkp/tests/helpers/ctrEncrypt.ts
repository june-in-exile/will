import { AESGCM } from "./aes-gcm";

function ctrEncrypt(plaintext: Byte[], key: Word[], j0: Byte16): Byte[] {
    const plaintextBuffer = Buffer.from(plaintext);
    const keyBuffer = Buffer.from(wordToByte(key));

    const ciphertextBuffer = AES.encryptBlock(plaintextBuffer, keyBuffer);
    const ciphertext = Array.from(ciphertextBuffer);

    return ciphertext as Byte16;
}

export { encryptBlock };
