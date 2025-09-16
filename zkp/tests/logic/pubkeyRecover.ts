import { Bit, Uint256, EcdsaSignature } from "../type/index.js";
import {
  byteToHex,
  splitBigInt,
  bitToByte,
  concatBigInts,
} from "../util/index.js";
import { Permit2 } from "./index.js";

function recoverPublicKey(
  signature: EcdsaSignature,
  bitsMsghash: Bit[],
): Uint256[] {
  const msghash = "0x" + byteToHex(bitToByte(bitsMsghash), false);
  const recoveredPublicKey = Permit2.recoverPublicKey(
    msghash,
    concatBigInts(signature.r),
    concatBigInts(signature.s),
    signature.v,
  );
  return [splitBigInt(recoveredPublicKey.x), splitBigInt(recoveredPublicKey.y)];
}

export { recoverPublicKey };
