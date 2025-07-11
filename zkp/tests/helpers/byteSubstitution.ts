import { AESSbox } from "./aes256gcm";
import { Word } from "../types";

function subWord(_in: Word): Word {
  const substituted = substituteBytes(_in.bytes);
  return { bytes: [substituted[0], substituted[1], substituted[2], substituted[3]] };
}

function substituteBytes(_in: number[]): number[] {
  const inBuffer = Buffer.from(_in);
  const outBuffer = AESSbox.substituteBytes(inBuffer);
  const _out = Array.from(outBuffer);
  return _out;
}

export { subWord, substituteBytes };