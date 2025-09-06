import { ECDSA, EllipticCurve } from "./index.js";
import {
  concatBigInts,
  pointToBigInts,
  bigIntsToPoint,
} from "../util/index.js";
import { Bit, Uint256 } from "../type/index.js";

function ecdsaPrivToPub(privkey: Uint256): Uint256[] {
  const privateKey = concatBigInts(privkey);
  const publicKey = EllipticCurve.pointMultiply(privateKey, ECDSA.G);
  const pubkey = pointToBigInts(publicKey);
  return pubkey;
}

function ecdsaVerifyNoPubkeyCheck(
  r: Uint256,
  s: Uint256,
  msghash: Uint256,
  pubkey: Uint256[],
): Bit {
  const messageHash = concatBigInts(msghash);
  const signature = { r: concatBigInts(r), s: concatBigInts(s) };
  const publicKey = bigIntsToPoint(pubkey);

  const result = ECDSA.verify(messageHash, signature, publicKey) ? 1 : 0;

  return result;
}

export { ecdsaPrivToPub, ecdsaVerifyNoPubkeyCheck };
