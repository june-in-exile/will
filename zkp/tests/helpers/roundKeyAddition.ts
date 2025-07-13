import { AESTransforms } from "./aes-gcm";
import { wordToByte } from "../utils";

function addRoundKey(state: Byte16, roundKey: Word4): { out: Byte16 } {
    const stateBuffer = Buffer.from(state);
    const roundKeyBuffer = Buffer.from(wordToByte(roundKey));

    const outBuffer = AESTransforms.addRoundKey(stateBuffer, roundKeyBuffer);
    const out = Array.from(outBuffer);

    return { out: out as Byte16 };
}

export { addRoundKey };