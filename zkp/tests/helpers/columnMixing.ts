import { AESTransforms } from "./aes-gcm";

function mixColumn(_in: Byte4): Byte4 {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESTransforms.mixColumn(inBuffer);
  const _out = Array.from(outBuffer);
  return _out as Byte4;
}

function mixColumns(_in: Byte16): Byte16 {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESTransforms.mixColumns(inBuffer);
  const _out = Array.from(outBuffer);
  return _out as Byte16;
}

export { mixColumn, mixColumns };
