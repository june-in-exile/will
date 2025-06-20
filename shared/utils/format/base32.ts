import { Base32String } from "types";

export const toBase32 = (val: bigint): Base32String => {
    try {
        const bigIntVal = BigInt(val);
        const base32String = "0x" + bigIntVal.toString(16).padStart(64, '0') as Base32String;
        return base32String;
    } catch {
        throw new Error(`Invalid number`);
    }
};