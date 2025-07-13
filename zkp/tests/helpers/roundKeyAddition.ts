import { AESTransforms } from "./aes-gcm";

function addRoundKey(state: Byte16, roundKey: Word4): { out: Byte16 } {
    const stateBuffer = Buffer.from(state);

    const roundKeyBytes = [];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            roundKeyBytes.push(roundKey[i].bytes[j]);
        }
    }
    const roundKeyBuffer = Buffer.from(roundKeyBytes);

    const outBuffer = AESTransforms.addRoundKey(stateBuffer, roundKeyBuffer);

    return { out: Array.from(outBuffer) as Byte16 };
}

export { addRoundKey };