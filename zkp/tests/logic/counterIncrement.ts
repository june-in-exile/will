import { Byte16 } from "../type/index.js";
import { AESGCM } from "./aes-gcm.js";

function incrementCounter(_in: Byte16): Byte16 {
  const inBuffer = Buffer.from(_in);
  AESGCM.incrementCounter(inBuffer);
  return Array.from(inBuffer) as Byte16;
}

export { incrementCounter };
