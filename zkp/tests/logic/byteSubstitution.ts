import { Word, Byte, Byte4, Byte16 } from "../type/index.js";
import { AESSbox } from "./aes-gcm.js";

function subWord(_in: Word): Word {
  const substituted = substituteBytes(_in.bytes);
  return {
    bytes: substituted as Byte4,
  };
}

function subBytes(_in: Byte16): Byte16 {
  const substituted = substituteBytes(_in);
  return substituted as Byte16;
}

function substituteBytes(_in: Byte[]): Byte[] {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESSbox.substituteBytes(inBuffer);
  const _out = Array.from(outBuffer);
  return _out as Byte[];
}

export { subWord, subBytes, substituteBytes };
