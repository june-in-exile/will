import { Keccak256, ECDSAUtils } from "./index.js";
import { Point } from "../../type/index.js";
import { concatBigInts } from "../../util/conversion.js";

class AbiEncoder {

    // Convert number to hex string with padding
    private static numberToHex(value: number | bigint, byteLength: number = 32): string {
        const hex = BigInt(value).toString(16);
        return hex.padStart(byteLength * 2, '0');
    }

    // Convert string to hex
    private static stringToHex(str: string): string {
        return Buffer.from(str, 'utf8').toString('hex');
    }

    // Pad hex string to 32 bytes (64 hex chars)
    private static padHex(hex: string, left: boolean = true): string {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        return left ?
            cleanHex.padStart(64, '0') :
            cleanHex.padEnd(64, '0');
    }

    // Detect type of a single value
    static detectType(value: any): string {
        if (typeof value === 'string') {
            // Check if it's an address (40 hex chars)
            if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
                return 'address';
            }
            // Check if it's bytes (hex string)
            if (/^0x[a-fA-F0-9]*$/.test(value)) {
                return 'bytes';
            }
            return 'string';
        }

        if (typeof value === 'number' || typeof value === 'bigint') {
            // Default to uint256, use int256 for negative numbers
            return value < 0 ? 'int256' : 'uint256';
        }

        if (typeof value === 'boolean') {
            return 'bool';
        }

        if (Array.isArray(value)) {
            if (value.length === 0) return 'bytes[]';

            const firstType = this.detectType(value[0]);
            // Check if all elements are the same type
            const allSameType = value.every(item => this.detectType(item) === firstType);

            if (allSameType) {
                return `${firstType}[]`;
            } else {
                // Mixed type array, treat as tuple
                const types = value.map(item => this.detectType(item));
                return `tuple(${types.join(',')})`;
            }
        }

        if (typeof value === 'object' && value !== null) {
            // Object as tuple
            const values = Object.values(value);
            const types = values.map(v => this.detectType(v));
            return `tuple(${types.join(',')})`;
        }

        throw new Error(`Cannot detect type for: ${typeof value}`);
    }

    // Encode a single value based on its type
    private static encodeSingleValue(type: string, value: any): string {
        if (type === 'uint256' || type === 'int256') {
            return this.padHex(this.numberToHex(value));
        }

        if (type === 'bool') {
            return this.padHex(value ? '01' : '00');
        }

        if (type === 'address') {
            const cleanAddress = value.startsWith('0x') ? value.slice(2) : value;
            return this.padHex(cleanAddress);
        }

        if (type === 'string') {
            const hexString = this.stringToHex(value);
            const length = this.padHex(this.numberToHex(hexString.length / 2));
            const paddedString = this.padHex(hexString, false);
            return length + paddedString;
        }

        if (type === 'bytes') {
            const cleanBytes = value.startsWith('0x') ? value.slice(2) : value;
            const length = this.padHex(this.numberToHex(cleanBytes.length / 2));
            const paddedBytes = this.padHex(cleanBytes, false);
            return length + paddedBytes;
        }

        if (type.endsWith('[]')) {
            const elementType = type.slice(0, -2);
            const length = this.padHex(this.numberToHex(value.length));
            let encoded = length;

            for (const item of value) {
                encoded += this.encodeSingleValue(elementType, item);
            }

            return encoded;
        }

        if (type.startsWith('tuple(')) {
            const innerTypes = type.slice(6, -1).split(',');
            let encoded = '';

            for (let i = 0; i < innerTypes.length; i++) {
                encoded += this.encodeSingleValue(innerTypes[i], value[i]);
            }

            return encoded;
        }

        throw new Error(`Unsupported type: ${type}`);
    }

    // Auto-detect types and encode multiple values
    static encode(...values: any[]): string {
        if (values.length === 0) return '0x';

        let encoded = '0x';
        let dynamicData = '';
        const staticSize = values.length * 32; // Each slot is 32 bytes

        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            const type = this.detectType(value);

            // Process object as tuple values
            const processedValue = (typeof value === 'object' && value !== null && !Array.isArray(value))
                ? Object.values(value)
                : value;

            if (this.isDynamicType(type)) {
                // For dynamic types, store offset in static part
                const offset = staticSize + dynamicData.length / 2;
                encoded += this.padHex(this.numberToHex(offset));

                // Add actual data to dynamic part
                const encodedValue = this.encodeSingleValue(type, processedValue);
                dynamicData += encodedValue;
            } else {
                // Static types go directly in static part
                encoded += this.encodeSingleValue(type, processedValue);
            }
        }

        return encoded + dynamicData;
    }

    // Check if type is dynamic
    private static isDynamicType(type: string): boolean {
        return type === 'string' ||
            type === 'bytes' ||
            type.endsWith('[]') ||
            type.startsWith('tuple(');
    }

    // Auto-detect and encode with packed encoding (no padding)
    static encodePacked(...values: any[]): string {
        let result = '0x';

        for (const value of values) {
            const type = this.detectType(value);

            if (type === 'string') {
                result += this.stringToHex(value);
            } else if (type === 'bytes') {
                const cleanBytes = value.startsWith('0x') ? value.slice(2) : value;
                result += cleanBytes;
            } else if (type.startsWith('uint') || type.startsWith('int')) {
                result += this.numberToHex(value);
            } else if (type === 'address') {
                const cleanAddress = value.startsWith('0x') ? value.slice(2) : value;
                result += cleanAddress.toLowerCase();
            } else if (type === 'bool') {
                result += value ? '01' : '00';
            } else if (type.endsWith('[]')) {
                // Array processing
                for (const item of value) {
                    const packedItem = this.encodePacked(item);
                    result += packedItem.slice(2); // Remove 0x prefix
                }
            }
        }

        return result;
    }

    static ecrecover(messageHash: bigint[], v: number, r: bigint[], s: bigint[]): bigint {
        try {
            // Calculate recovery ID
            let recoveryId = v;
            if (v === 27 || v === 28) {
                recoveryId = v - 27;
            } else if (v > 28) {
                // EIP-155: v = recovery_id + 35 + 2 * chain_id
                recoveryId = (v - 35) % 2;
            }

            const publicKey = ECDSAUtils.recoverPublicKey(
                concatBigInts(messageHash),
                { r: concatBigInts(r), s: concatBigInts(s) },
                recoveryId
            );

            if (!publicKey || publicKey.isInfinity) {
                return 0n;
            }

            // Convert public key to address
            const address = this.publicKeyToAddress(publicKey);
            return address;

        } catch {
            return 0n;
        }
    }

    private static publicKeyToAddress(publicKey: Point): bigint {
        // Convert coordinates to hex (remove 0x prefix, pad to 64 chars)
        const xHex = publicKey.x.toString(16).padStart(64, '0');
        const yHex = publicKey.y.toString(16).padStart(64, '0');

        // Concatenate x and y coordinates (uncompressed format without 0x04 prefix)
        const publicKeyHex = xHex + yHex;

        // Hash with keccak256 and take last 20 bytes
        const publicKeyHash = Keccak256.hash(publicKeyHex);

        return BigInt('0x' + publicKeyHash.slice(-40));
    }
}

// Usage examples
function examples() {
    // Auto type detection encoding
    const encoded1 = AbiEncoder.encode(42, "hello", true);
    console.log('Auto encode:', encoded1);

    // Address and number
    const encoded2 = AbiEncoder.encode(
        "0x742d35Cc6634C0532925a3b8D6Ac68d2dC26e203",
        BigInt("1000000000000000000") // 1 ETH in wei
    );
    console.log('Address + BigInt:', encoded2);

    // Arrays
    const encoded3 = AbiEncoder.encode([1, 2, 3], ["a", "b"]);
    console.log('Arrays:', encoded3);

    // Object as struct
    const user = { name: "Alice", age: 25, active: true };
    const encoded4 = AbiEncoder.encode(user);
    console.log('Object as struct:', encoded4);

    // Packed encoding
    const packed = AbiEncoder.encodePacked(123, "0x742d35Cc6634C0532925a3b8D6Ac68d2dC26e203");
    console.log('Auto packed:', packed);

    // Type detection tests
    console.log('Type detection:');
    console.log('42 ->', AbiEncoder.detectType(42));
    console.log('"hello" ->', AbiEncoder.detectType("hello"));
    console.log('address ->', AbiEncoder.detectType("0x742d35Cc6634C0532925a3b8D6Ac68d2dC26e203"));
    console.log('[1,2,3] ->', AbiEncoder.detectType([1, 2, 3]));
    console.log('object ->', AbiEncoder.detectType({ name: "Alice", age: 25 }));
}

if (
    typeof process !== "undefined" &&
    process.argv?.[1] &&
    process.argv[1].endsWith("abiEncoder.ts")
) {
    examples();
}

export { AbiEncoder };