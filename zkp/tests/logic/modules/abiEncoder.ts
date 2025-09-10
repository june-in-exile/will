import { Keccak256, ECDSAUtils } from "./index.js";
import { Point } from "../../type/index.js";
import { concatBigInts } from "../../util/conversion.js";
import { AbiCoder, solidityPacked } from 'ethers';
import chalk from "chalk";

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
            // Check if it's bytes32 (64 hex chars)
            if (/^0x[a-fA-F0-9]{64}$/.test(value)) {
                return 'bytes32';
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

        if (type === 'bytes32') {
            const cleanBytes = value.startsWith('0x') ? value.slice(2) : value;
            return this.padHex(cleanBytes);
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

            if (this.isDynamicType(elementType)) {
                // Dynamic array elements need offset pointers
                let encoded = length;
                let dynamicData = '';
                const staticSize = value.length * 32; // Each pointer is 32 bytes

                for (let i = 0; i < value.length; i++) {
                    // Add offset pointer
                    const offset = staticSize + dynamicData.length / 2;
                    encoded += this.padHex(this.numberToHex(offset));

                    // Add actual data
                    const itemEncoded = this.encodeSingleValue(elementType, value[i]);
                    dynamicData += itemEncoded;
                }

                return encoded + dynamicData;
            } else {
                // Static array elements can be directly concatenated
                let encoded = length;
                for (const item of value) {
                    encoded += this.encodeSingleValue(elementType, item);
                }
                return encoded;
            }
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

            if (type.endsWith('[]')) {
                // Array processing - process each item individually
                for (const item of value) {
                    const itemType = this.detectType(item);
                    if (itemType === 'string') {
                        result += this.stringToHex(item);
                    } else if (itemType === 'bytes32') {
                        const cleanBytes = item.startsWith('0x') ? item.slice(2) : item;
                        result += cleanBytes;
                    } else if (itemType === 'bytes') {
                        const cleanBytes = item.startsWith('0x') ? item.slice(2) : item;
                        result += cleanBytes;
                    } else if (itemType.startsWith('uint') || itemType.startsWith('int')) {
                        result += this.numberToHex(item);
                    } else if (itemType === 'address') {
                        const cleanAddress = item.startsWith('0x') ? item.slice(2) : item;
                        result += this.padHex(cleanAddress);
                    } else if (itemType === 'bool') {
                        result += item ? '01' : '00';
                    }
                }
            } else if (type === 'string') {
                result += this.stringToHex(value);
            } else if (type === 'bytes32') {
                const cleanBytes = value.startsWith('0x') ? value.slice(2) : value;
                result += cleanBytes;
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

function truncateHex(hex: string) {
    if (hex.length <= 62) return `${hex} (${hex.length} chars)`;
    return `${hex.slice(0, 42)}...${hex.slice(-20)} (${hex.length} chars)`;
}

function validateEncoding(abiCoder: AbiCoder, ...values: any[]): boolean {
    let allPessed = true;

    if (values.length === 0) {
        throw new Error('At least one value is required');
    }

    const types = values.map(value => AbiEncoder.detectType(value));
    console.log(`\nInputs  : ${values.join(', ')}`);
    console.log(`Types   : ${types.join(', ')}`);

    const ethersEncoded = abiCoder.encode(types, values);
    const encoded = AbiEncoder.encode(...values);
    const encodedMatches = (ethersEncoded.toLowerCase() === encoded.toLowerCase());

    const ethersEncodedPacked = solidityPacked(types, values);
    const encodedPacked = AbiEncoder.encodePacked(...values);
    const encodedPackedMatches = (ethersEncodedPacked.toLowerCase() === encodedPacked.toLowerCase());

    console.log(chalk.gray("/* Unpacked */"))
    console.log('Ethers  :', encodedMatches ? truncateHex(ethersEncoded) : ethersEncoded);
    console.log('Our impl:', encodedMatches ? truncateHex(encoded) : encoded, encodedMatches ? "✅" : "❌");

    console.log(chalk.gray("/* Packed */"))
    console.log('Ethers  :', encodedPackedMatches ? truncateHex(ethersEncodedPacked) : ethersEncodedPacked);
    console.log('Our impl:', encodedPackedMatches ? truncateHex(encodedPacked) : encodedPacked, encodedPackedMatches ? "✅" : "❌");

    allPessed = allPessed && encodedMatches;
    allPessed = allPessed && encodedPackedMatches;

    return allPessed;
}

function abiEncoderVerification() {
    const abiCoder = AbiCoder.defaultAbiCoder();

    let allPassed = true;

    console.log(
        chalk.cyan(
            "\n=== Single element encoding ===",
        ),
    );
    const inputElements = [
        42,
        BigInt("1000000000000000000"), // 1 ETH in wei
        "hello",
        "0x742d35cc6634c0532925a3b8d6ac68d2dc26e203", // address should be in lower case
    ];
    for (const input of inputElements) {
        allPassed = allPassed && validateEncoding(abiCoder, input);
    }

    console.log(
        chalk.cyan(
            "\n=== Array of the same type encoding ===",
        ),
    );
    const inputArrays = [
        [1, 2, 3],
        [BigInt("1000000000000000000"), BigInt("1"), BigInt("2000000000000000000")],
        ["a", "b", "c"],
        ["0x742d35cc6634c0532925a3b8d6ac68d2dc26e203", "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d", "0xb1d4538b4571d411f07960ef2838ce337fe1e80e"], // address should be in lower case
    ];
    for (const input of inputArrays) {
        allPassed = allPassed && validateEncoding(abiCoder, input);
    }

    console.log(
        chalk.cyan(
            "\n=== Multiple elements of the same type encoding ===",
        ),
    );
    allPassed = allPassed && validateEncoding(abiCoder, 1, 2, 3);
    allPassed = allPassed && validateEncoding(abiCoder, BigInt("1000000000000000000"), BigInt("2000000000000000000"), 1n);
    allPassed = allPassed && validateEncoding(abiCoder, "a", "b", "c");
    allPassed = allPassed && validateEncoding(abiCoder, "0x742d35cc6634c0532925a3b8d6ac68d2dc26e203", "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d", "0xb1d4538b4571d411f07960ef2838ce337fe1e80e");

    console.log(
        chalk.cyan(
            "\n=== Multiple elements of mixed types encoding ===",
        ),
    );

    allPassed = allPassed && validateEncoding(abiCoder, 1, BigInt("1000000000000000000"), "a", "0x742d35cc6634c0532925a3b8d6ac68d2dc26e203");
    allPassed = allPassed && validateEncoding(abiCoder, [123], [BigInt("1000000000000000000"), 1n], ["a", "b"], "0x742d35cc6634c0532925a3b8d6ac68d2dc26e203");
    allPassed = allPassed && validateEncoding(abiCoder, "0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1", "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", 1000n);

    console.log(
        "\nOverall status:",
        allPassed ? "🎉 All tests passed!" : "❌  Issues need debugging",
    );
}

if (
    typeof process !== "undefined" &&
    process.argv?.[1] &&
    process.argv[1].endsWith("abiEncoder.ts")
) {
    abiEncoderVerification();
}

export { AbiEncoder };

