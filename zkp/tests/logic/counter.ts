import { Byte, Byte12, Byte16 } from "../type/index.js";
import { AESGCM } from "./modules/aesGcm.js";

function computeJ0Standard(iv: Byte12): Byte16 {
  const ivBuffer = Buffer.from(iv);
  const hashKey = Buffer.alloc(16); // This won't be used

  const j0Buffer = AESGCM.computeJ0(ivBuffer, hashKey);
  return Array.from(j0Buffer) as Byte16;
}

function computeJ0NonStandard(iv: Byte[], hashKey: Byte16): Byte16 {
  const ivBuffer = Buffer.from(iv);
  const hashKeyBuffer = Buffer.from(hashKey);

  const j0Buffer = AESGCM.computeJ0(ivBuffer, hashKeyBuffer);
  return Array.from(j0Buffer) as Byte16;
}

function incrementCounter(_in: Byte16): Byte16 {
  const inBuffer = Buffer.from(_in);
  AESGCM.incrementCounter(inBuffer);
  return Array.from(inBuffer) as Byte16;
}

export { computeJ0Standard, computeJ0NonStandard, incrementCounter };
