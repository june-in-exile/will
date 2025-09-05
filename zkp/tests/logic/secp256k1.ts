import { ECDSAUtils } from "./cryptography/ecdsa.js";
import { bigIntsToPoint, pointToBigInts } from "../util/index.js";

function secp256k1AddUnequal(a: bigint[][], b: bigint[][]): bigint[][] {
    const p1 = bigIntsToPoint(a);
    const p2 = bigIntsToPoint(b);

    const p3 = ECDSAUtils.pointAdd(p1, p2);
    const out = pointToBigInts(p3);
    return out;
}

export { secp256k1AddUnequal };