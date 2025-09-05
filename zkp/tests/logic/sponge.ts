import { Bit } from "../type/index.js";
import { Keccak256, Keccak256Utils } from "./cryptography/keccak256.js";

function absorb(msg: Bit[]): number[][][] {
  const msgBytes = Keccak256Utils.bitsToBytes(msg);
  const lanes = Keccak256.absorb(msgBytes);

  return Keccak256Utils.lanesToStateArray(lanes);
}

function squeeze(stateArray: number[][][]): Bit[] {
  const lanes = Keccak256Utils.stateArrayToLanes(stateArray);
  const digest = Keccak256.squeeze(lanes, 32);

  return Keccak256Utils.bytesToBits(digest) as Bit[];
}

export { absorb, squeeze };
