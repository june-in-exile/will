import { Bit, Byte } from "../type/index.js";
import { Keccak256, Keccak256Utils } from "./keccak256.js";
import { hexToByte } from "../util/index.js";

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

function keccak256(msg: Byte[]): Byte[] {
  const digest = Keccak256.hash(Uint8Array.from(msg));

  return hexToByte(digest) as Byte[];
}

export { absorb, squeeze, keccak256 };
