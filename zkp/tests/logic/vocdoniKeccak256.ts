import { Bit } from "../type/index.js";
import { Keccak256 } from "./cryptography/keccak256.js";

function vocdoniKeccak256(msg: Bit[]): Bit[] {
  const digest = Keccak256.hashBits(msg);

  return digest as Bit[];
}

export { vocdoniKeccak256 };
