import { ECDSA, ECDSAUtils } from "./index.js";
import { concatBigInts, pointToPubkey, pubkeyToPoint } from "../util/index.js";
import { Bit } from "../type/index.js";

function ecdsaPrivToPub(privkey: bigint[]): bigint[][] {
    const privateKey = concatBigInts(privkey);
    const publicKey = ECDSAUtils.pointMultiply(privateKey, ECDSA.G);
    const pubkey = pointToPubkey(publicKey);
    return pubkey;
}

function ecdsaVerifyNoPubkeyCheck(r: bigint[], s: bigint[], msghash: bigint[], pubkey: bigint[][]): Bit { 
    const messageHash = concatBigInts(msghash);
    const signature = { r: concatBigInts(r), s: concatBigInts(s) };
    const publicKey = pubkeyToPoint(pubkey);

    const result = ECDSA.verify(messageHash, signature, publicKey)
        ? 1
        : 0;
    
    return result;
}

export { ecdsaPrivToPub, ecdsaVerifyNoPubkeyCheck };