import { Bit } from "../type/index.js";
import { Keccak256, Keccak256Utils } from "./keccak256.js";
import { hexToByte, byteToBit } from "../util/index.js";

function vocdoniKeccak256(inBits: Bit[]): Bit[] {
    const inBytes = Keccak256Utils.bitsToBytes(inBits);
    const outHex = Keccak256.hash(inBytes);
    const outBytes = hexToByte(outHex);
    const outBits = byteToBit(outBytes);

    return outBits as Bit[];
}

export { vocdoniKeccak256 };