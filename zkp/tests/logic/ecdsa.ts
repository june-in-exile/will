import { ECDSA, EllipticCurve } from "./index.js";
import {
  concatBigInts,
  ecdsaPointToBigInts,
  bigIntsToEcdsaPoint,
} from "../util/index.js";
import { Bit, Uint256, ConcatedEcdsaPoint } from "../type/index.js";

function ecdsaPrivToPub(privkey: Uint256): Uint256[] {
  const privateKey = concatBigInts(privkey);
  const publicKey = EllipticCurve.pointMultiply(privateKey, ECDSA.G);
  const pubkey = ecdsaPointToBigInts(publicKey);
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
  const publicKey = bigIntsToEcdsaPoint(pubkey, true) as ConcatedEcdsaPoint;

  const result = ECDSA.verify(messageHash, signature, publicKey) ? 1 : 0;

  return result;
}

export { ecdsaPrivToPub, ecdsaVerifyNoPubkeyCheck };
