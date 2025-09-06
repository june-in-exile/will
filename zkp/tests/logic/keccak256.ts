import { Bit } from "../type/index.js";
import { Keccak256 } from "./modules/keccak256.js";

function keccak256(msg: Bit[]): Bit[] {
  const digest = Keccak256.hashBits(msg);

  return digest as Bit[];
}

export { keccak256 };
