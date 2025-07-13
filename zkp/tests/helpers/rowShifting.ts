import { AESTransforms } from "./aes-gcm";

function shiftRows(_in: Byte16): Byte16 {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESTransforms.shiftRows(inBuffer);
  const _out = Array.from(outBuffer);
  return _out as Byte16;
}

export { shiftRows };
