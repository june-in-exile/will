import { ethers } from "ethers";
import chalk from "chalk";

/**
 * Complete Keccak256 Implementation
 * Based on FIPS 202 standard
 */

class Keccak256 {
    private static readonly ROUNDS = 24;
    private static readonly STATE_BITS = 1600; // 1600 bits
    private static readonly OUTPUT_BYTES = 32; // 256 bits / 8 = 32 bytes
    private static readonly CAPACITY_BYTES = 64; // output length * 2 = 64 bytes = 512 bits
    private static readonly RATE_BYTES = 136; // 1600 bits - 512 bits = 1088 bits / 8 = 136 bytes

    // Round constants for ι (iota) step
    private static readonly ROUND_CONSTANTS = [
        0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
        0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
        0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
        0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
        0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
        0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
    ];

    // ρ (rho) rotation offsets
    private static readonly RHO_OFFSETS = [
        0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14
    ];

    // π (pi) lane permutation
    private static readonly PI_POSITIONS = [
        0, 6, 12, 18, 24, 3, 9, 10, 16, 22, 1, 7, 13, 19, 20, 4, 5, 11, 17, 23, 2, 8, 14, 15, 21
    ];

    /**
     * Main Keccak256 hash function
     */
    static hash(input: string | Uint8Array): string {
        const inputBytes = this.prepareInput(input);
        const paddedInput = this.pad(inputBytes);
        const state = this.absorb(paddedInput);
        const output = this.squeeze(state);
        return '0x' + this.bytesToHex(output);
    }

    /**
     * Convert input to bytes
     */
    static prepareInput(input: string | Uint8Array): Uint8Array {
        if (typeof input === 'string') {
            // Remove 0x prefix if present
            const cleanHex = input.startsWith('0x') ? input.slice(2) : input;

            // Check if it's hex or plain text
            if (/^[0-9a-fA-F]*$/.test(cleanHex) && cleanHex.length % 2 === 0) {
                // It's hex
                const bytes = new Uint8Array(cleanHex.length / 2);
                for (let i = 0; i < cleanHex.length; i += 2) {
                    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
                }
                return bytes;
            } else {
                // It's plain text
                return new TextEncoder().encode(input);
            }
        }
        return input;
    }

    /**
     * Add Keccak padding (10*1 pattern)
     */
    static pad(input: Uint8Array): Uint8Array {
        const inputLength = input.length;
        const paddingLength = this.RATE_BYTES - (inputLength % this.RATE_BYTES);

        const padded = new Uint8Array(inputLength + paddingLength);
        padded.set(input, 0);

        // Add padding: first bit is 1
        padded[inputLength] = 0x01;

        // Last bit is 1 (XOR with 0x80)
        padded[padded.length - 1] |= 0x80;

        return padded;
    }

    /**
     * Absorb phase - process input blocks
     */
    static absorb(input: Uint8Array): BigUint64Array {
        const state = new BigUint64Array(this.STATE_BITS / 64);

        // Process each rate-sized block
        for (let offset = 0; offset < input.length; offset += this.RATE_BYTES) {
            const block = input.slice(offset, offset + this.RATE_BYTES);

            // XOR block with state (first 17 lanes for Keccak256)
            for (let i = 0; i < Math.min(block.length, this.RATE_BYTES); i += 8) {
                const laneIndex = Math.floor(i / 8);
                if (laneIndex < 17) { // RATE_BYTES / 8 = 17 lanes
                    const lane = this.bytesToLane(block, i);
                    state[laneIndex] ^= lane;
                }
            }

            // Apply Keccak-f permutation
            this.keccakF(state);
        }

        return state;
    }

    /**
     * Squeeze phase - extract output
     */
    static squeeze(state: BigUint64Array): Uint8Array {
        const output = new Uint8Array(this.OUTPUT_BYTES);
        let outputOffset = 0;

        while (outputOffset < this.OUTPUT_BYTES) {
            // Extract bytes from current state
            for (let i = 0; i < 17 && outputOffset < this.OUTPUT_BYTES; i++) {
                const laneBytes = this.laneToBytes(state[i]);
                const bytesToCopy = Math.min(8, this.OUTPUT_BYTES - outputOffset);
                output.set(laneBytes.slice(0, bytesToCopy), outputOffset);
                outputOffset += bytesToCopy;
            }

            // If we need more output, apply permutation again
            if (outputOffset < this.OUTPUT_BYTES) {
                this.keccakF(state);
            }
        }

        return output;
    }

    /**
     * Keccak-f[1600] permutation
     */
    static keccakF(state: BigUint64Array): void {
        for (let round = 0; round < this.ROUNDS; round++) {
            // θ (theta) step
            this.theta(state);

            // ρ (rho) step
            this.rho(state);

            // π (pi) step
            this.pi(state);

            // χ (chi) step
            this.chi(state);

            // ι (iota) step
            this.iota(state, round);
        }
    }

    /**
     * θ (theta) step: Column parity computation
     */
    static theta(state: BigUint64Array): void {
        const C = new BigUint64Array(5);
        const D = new BigUint64Array(5);

        // Compute column parity
        for (let x = 0; x < 5; x++) {
            C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
        }

        // Compute D values
        for (let x = 0; x < 5; x++) {
            D[x] = C[(x + 4) % 5] ^ this.rotateLeft64(C[(x + 1) % 5], 1);
        }

        // Apply theta transformation
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                state[y * 5 + x] ^= D[x];
            }
        }
    }

    /**
     * ρ (rho) step: Bit rotation
     */
    static rho(state: BigUint64Array): void {
        const newState = new BigUint64Array(25);

        for (let i = 0; i < 25; i++) {
            newState[i] = this.rotateLeft64(state[i], this.RHO_OFFSETS[i]);
        }

        state.set(newState);
    }

    /**
     * π (pi) step: Lane permutation
     */
    static pi(state: BigUint64Array): void {
        const newState = new BigUint64Array(25);

        for (let i = 0; i < 25; i++) {
            newState[i] = state[this.PI_POSITIONS[i]];
        }

        state.set(newState);
    }

    /**
     * χ (chi) step: Non-linear transformation
     */
    static chi(state: BigUint64Array): void {
        const newState = new BigUint64Array(25);

        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const i = y * 5 + x;
                const j = y * 5 + ((x + 1) % 5);
                const k = y * 5 + ((x + 2) % 5);
                newState[i] = state[i] ^ (~state[j] & state[k]);
            }
        }

        state.set(newState);
    }

    /**
     * ι (iota) step: Add round constant
     */
    static iota(state: BigUint64Array, round: number): void {
        state[0] ^= this.ROUND_CONSTANTS[round];
    }

    /**
     * 64-bit left rotation
     */
    static rotateLeft64(value: bigint, positions: number): bigint {
        const n = BigInt(positions % 64);
        return ((value << n) | (value >> (64n - n))) & 0xFFFFFFFFFFFFFFFFn;
    }

    /**
     * Convert 8 bytes to a 64-bit lane (little-endian)
     */
    static bytesToLane(bytes: Uint8Array, offset: number): bigint {
        let result = 0n;
        for (let i = 0; i < 8 && offset + i < bytes.length; i++) {
            result |= BigInt(bytes[offset + i]) << BigInt(i * 8);
        }
        return result;
    }

    /**
     * Convert a 64-bit lane to 8 bytes (little-endian)
     */
    static laneToBytes(lane: bigint): Uint8Array {
        const bytes = new Uint8Array(8);
        for (let i = 0; i < 8; i++) {
            bytes[i] = Number((lane >> BigInt(i * 8)) & 0xFFn);
        }
        return bytes;
    }

    /**
     * Convert bytes to hex string
     */
    static bytesToHex(bytes: Uint8Array): string {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Convert 200 bytes to Keccak state array (5x5x64 bits)
     */
    static bytesToStateArray(bytes: Uint8Array): number[][][] {
        if (bytes.length !== 200) {
            throw new Error(`Expected 200 bytes, got ${bytes.length}`);
        }

        const stateArray: number[][][] = [];

        // Initialize 5x5x64 array
        for (let y = 0; y < 5; y++) {
            stateArray[y] = [];
            for (let x = 0; x < 5; x++) {
                stateArray[y][x] = new Array(64);
            }
        }

        // Convert each 8-byte sequence to a 64-bit lane
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const laneIndex = y * 5 + x; // Lane index (0-24)
                const byteOffset = laneIndex * 8; // Each lane is 8 bytes

                // Convert 8 bytes to 64 bits (little-endian)
                for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
                    const byte = bytes[byteOffset + byteIdx];

                    // Extract each bit from the byte (LSB first)
                    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
                        const bit = (byte >> bitIdx) & 1;
                        stateArray[x][y][byteIdx * 8 + bitIdx] = bit;
                    }
                }
            }
        }

        return stateArray;
    }

    /**
     * Convert Keccak state array (5x5x64 bits) to 200 bytes
     */
    static stateArrayToBytes(stateArray: number[][][]): Uint8Array {
        if (stateArray.length !== 5) {
            throw new Error(`Expected 5 rows, got ${stateArray.length}`);
        }

        const bytes = new Uint8Array(200);

        // Convert each 64-bit lane to 8 bytes
        for (let y = 0; y < 5; y++) {
            if (stateArray[y].length !== 5) {
                throw new Error(`Expected 5 columns in row ${y}, got ${stateArray[y].length}`);
            }

            for (let x = 0; x < 5; x++) {
                if (stateArray[x][y].length !== 64) {
                    throw new Error(`Expected 64 bits in lane [${x}][${y}], got ${stateArray[x][y].length}`);
                }

                const laneIndex = y * 5 + x; // Lane index (0-24)
                const byteOffset = laneIndex * 8; // Each lane is 8 bytes

                // Group 64 bits into 8 bytes (little-endian)
                for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
                    let byteValue = 0;

                    // Combine 8 bits into a byte (LSB first)
                    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
                        const bit = stateArray[x][y][byteIdx * 8 + bitIdx];
                        if (bit !== 0 && bit !== 1) {
                            throw new Error(`Invalid bit value ${bit} at [${x}][${y}][${byteIdx * 8 + bitIdx}]`);
                        }
                        byteValue |= bit << bitIdx;
                    }

                    bytes[byteOffset + byteIdx] = byteValue;
                }
            }
        }

        return bytes;
    }
}

class Keccak256Verification {
    static testKeccak256(): boolean {
        let allPassed = true;

        console.log(
            chalk.cyan(
                "\n=== Ether module Keccak256 hash verification ===",
            )
        );

        const testVectors = [
            '',
            'Hello World',
            '0x48656c6c6f20576f726c64', // "Hello World" in hex
            new Uint8Array([0x00]), // single byte
            'The quick brown fox jumps over the lazy dog', // longer message
        ]

        for (const testVector of testVectors) {
            const input = Keccak256.prepareInput(testVector);
            const expectedDigest = ethers.keccak256(input);
            console.log(
                "Ether:\t\t\t",
                expectedDigest,
            );

            const actualDigest = Keccak256.hash(input);
            const isEqual = (actualDigest == expectedDigest);
            console.log(
                "Our implementation:\t",
                actualDigest,
                isEqual ? "✅" : "❌",
            );

            allPassed = allPassed && isEqual;
        }

        return allPassed;
    }

    static runAllTests(): boolean {
        const kecccak256Passed = this.testKeccak256();

        console.log("\n📊 Complete Test Summary:");
        console.log("Keccak256:", kecccak256Passed ? "✅" : "❌");

        const allPassed =
            kecccak256Passed;

        console.log(
            "Overall status:",
            allPassed ? "🎉 All tests passed!" : "⚠️  Issues need debugging",
        );

        return allPassed;
    }
}

if (
    typeof process !== "undefined" &&
    process.argv?.[1] &&
    process.argv[1].endsWith("keccak256.ts")
) {
    Keccak256Verification.runAllTests();
}

export {
    Keccak256,
    Keccak256Verification,
}