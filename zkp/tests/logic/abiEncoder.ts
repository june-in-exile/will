import { Byte, Byte32 } from "../type/index.js";
import { byteToHex, hexToByte } from "../util/conversion.js";
import { AbiEncoder } from "./modules/abiEncoder.js";

function abiEncode(values: Byte32[]): Byte[] {
    const types = Array(values.length).fill("bytes32");
    const hexValues: string[] = values.map((v) => byteToHex(v));
    const encodedValues = AbiEncoder.encode(types, hexValues);
    const result = hexToByte(encodedValues);
    if (result.length !== values.length * 32) {
        throw new Error(`Length are not equal. Before encoding: ${values.length * 32}. After encoding: ${result.length}`);
    }
    return result;
}

export { abiEncode };
