import { Word4, Byte16 } from "../type/index.js";
import { AESTransforms } from "./aes-gcm.js";
import { wordToByte } from "../util/index.js";

function addRoundKey(state: Byte16, roundKey: Word4): { out: Byte16 } {
  const stateBuffer = Buffer.from(state);
  const roundKeyBuffer = Buffer.from(wordToByte(roundKey));

  const outBuffer = AESTransforms.addRoundKey(stateBuffer, roundKeyBuffer);
  const out = Array.from(outBuffer);

  return { out: out as Byte16 };
}

export { addRoundKey };
