import { ECDSA, EllipticCurve } from "./index.js";
import {
  concatBigInts,
  pointToBigInts,
  bigIntsToPoint,
} from "../util/index.js";
import { Bit } from "../type/index.js";

function ecdsaPrivToPub(privkey: bigint[]): bigint[][] {
  const privateKey = concatBigInts(privkey);
  const publicKey = EllipticCurve.pointMultiply(privateKey, ECDSA.G);
  const pubkey = pointToBigInts(publicKey);
  return pubkey;
}

function ecdsaVerifyNoPubkeyCheck(
  r: bigint[],
  s: bigint[],
  msghash: bigint[],
  pubkey: bigint[][],
): Bit {
  const messageHash = concatBigInts(msghash);
  const signature = { r: concatBigInts(r), s: concatBigInts(s) };
  const publicKey = bigIntsToPoint(pubkey);

  const result = ECDSA.verify(messageHash, signature, publicKey) ? 1 : 0;

  return result;
}

export { ecdsaPrivToPub, ecdsaVerifyNoPubkeyCheck };
