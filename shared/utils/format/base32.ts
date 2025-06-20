export const bigintToBase32 = (val: bigint, path: string): string => {
    try {
        const bigIntVal = BigInt(val);
        return "0x" + bigIntVal.toString(16).padStart(64, '0');
    } catch {
        throw new Error(`Invalid number at ${path}: ${val}`);
    }
};