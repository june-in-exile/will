import { ethers } from "ethers";
import chalk from "chalk";

/**
 * Complete Keccak256 Implementation
 * Based on FIPS 202 standard
 */
class Keccak256Utils {
  /**
   * Convert 200 bytes to Keccak state array (5x5x64 bits)
   */
  static bytesToStateArray(bytes: Uint8Array): number[][][] {
    if (bytes.length !== 200) {
      throw new Error(`Expected 200 bytes, got ${bytes.length}`);
    }

    const stateArray = this.createEmptyStateArray();

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
    if (!this.validateStateArray(stateArray)) {
      throw new Error(`Invallid state array`);
    }

    const bytes = new Uint8Array(200);

    // Convert each 64-bit lane to 8 bytes
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const laneIndex = y * 5 + x; // Lane index (0-24)
        const byteOffset = laneIndex * 8; // Each lane is 8 bytes

        // Group 64 bits into 8 bytes (little-endian)
        for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
          let byteValue = 0;

          // Combine 8 bits into a byte (LSB first)
          for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
            const bit = stateArray[x][y][byteIdx * 8 + bitIdx];
            byteValue |= bit << bitIdx;
          }

          bytes[byteOffset + byteIdx] = byteValue;
        }
      }
    }

    return bytes;
  }

  /**
   * Convert 25 lanes to Keccak state array (5x5x64 bits)
   */
  static lanesToStateArray(lanes: BigUint64Array): number[][][] {
    if (lanes.length !== 25) {
      throw new Error(`Expected 25 lanes, got ${lanes.length}`);
    }

    const stateArray = this.createEmptyStateArray();

    // Convert each 64-bit lane to bits
    for (let laneIdx = 0; laneIdx < 25; laneIdx++) {
      const y = Math.floor(laneIdx / 5);
      const x = laneIdx % 5;
      const lane = lanes[laneIdx];

      // Extract each bit from the 64-bit lane
      for (let bitIdx = 0; bitIdx < 64; bitIdx++) {
        const bit = Number((lane >> BigInt(bitIdx)) & 1n);
        stateArray[x][y][bitIdx] = bit;
      }
    }

    return stateArray;
  }

  /**
   * Convert Keccak state array (5x5x64 bits) to 25 lanes
   */
  static stateArrayToLanes(stateArray: number[][][]): BigUint64Array {
    if (!this.validateStateArray(stateArray)) {
      throw new Error("Invalid state array");
    }

    const lanes = new BigUint64Array(25);

    // Convert each lane from bits to 64-bit value
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const laneIdx = y * 5 + x;
        let laneValue = 0n;

        // Combine 64 bits into a single 64-bit value
        for (let bitIdx = 0; bitIdx < 64; bitIdx++) {
          const bit = BigInt(stateArray[x][y][bitIdx]);
          laneValue |= bit << BigInt(bitIdx);
        }

        lanes[laneIdx] = laneValue;
      }
    }

    return lanes;
  }

  /**
   * Convert bytes to bits array (each byte becomes 8 bits)
   */
  static bytesToBits(bytes: Uint8Array): number[] {
    const bits: number[] = [];

    for (let byteIdx = 0; byteIdx < bytes.length; byteIdx++) {
      const byte = bytes[byteIdx];

      // Extract each bit from the byte (LSB first)
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        const bit = (byte >> bitIdx) & 1;
        bits.push(bit);
      }
    }

    return bits;
  }

  /**
   * Convert bits array to bytes (every 8 bits becomes 1 byte)
   */
  static bitsToBytes(bits: number[]): Uint8Array {
    if (bits.length % 8 !== 0) {
      throw new Error(`Bits array length must be multiple of 8, got ${bits.length}`);
    }

    // Validate that all values are 0 or 1
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== 0 && bits[i] !== 1) {
        throw new Error(`All bits must be 0 or 1, found ${bits[i]} at index ${i}`);
      }
    }

    const bytes = new Uint8Array(bits.length / 8);

    for (let byteIdx = 0; byteIdx < bytes.length; byteIdx++) {
      let byteValue = 0;

      // Combine 8 bits into a byte (LSB first)
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        const bit = bits[byteIdx * 8 + bitIdx];
        byteValue |= bit << bitIdx;
      }

      bytes[byteIdx] = byteValue;
    }

    return bytes;
  }

  /**
   * Generate random Uint8Array of specified length
   * @note Keep this for debug purpose
   */
  static randomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    const randomBytes = crypto.getRandomValues(new Uint8Array(length));
    bytes.set(randomBytes);
    return bytes;
  }

  /**
   * Convert 25 lanes to hex string (200 bytes)
   * @note Keep this for debug purpose
   */
  static lanesToHex(lanes: BigUint64Array): string {
    if (lanes.length !== 25) {
      throw new Error(`Expected 25 lanes, got ${lanes.length}`);
    }

    const bytes = this.stateArrayToBytes(this.lanesToStateArray(lanes));
    const hexBytes = Array.from(bytes)
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"));

    // Group by 16 bytes per line
    const lines: string[] = [];
    for (let i = 0; i < hexBytes.length; i += 16) {
      lines.push(hexBytes.slice(i, i + 16).join(" "));
    }

    return lines.join("\n");
  }

  /**
   * Create empty state array (5x5x64 bits, all zeros)
   */
  private static createEmptyStateArray(): number[][][] {
    const stateArray: number[][][] = [];

    for (let x = 0; x < 5; x++) {
      stateArray[x] = [];
      for (let y = 0; y < 5; y++) {
        stateArray[x][y] = new Array(64).fill(0);
      }
    }

    return stateArray;
  }

  /**
   * Validate Keccak state array has the correct 5x5x64 structure
   */
  private static validateStateArray(stateArray: number[][][]): boolean {
    if (!Array.isArray(stateArray) || stateArray.length !== 5) {
      return false;
    }

    for (let x = 0; x < 5; x++) {
      if (!Array.isArray(stateArray[x]) || stateArray[x].length !== 5) {
        return false;
      }

      for (let y = 0; y < 5; y++) {
        if (
          !Array.isArray(stateArray[x][y]) ||
          stateArray[x][y].length !== 64
        ) {
          return false;
        }

        // Check that all values are 0 or 1
        for (let z = 0; z < 64; z++) {
          const value = stateArray[x][y][z];
          if (value !== 0 && value !== 1) {
            return false;
          }
        }
      }
    }

    return true;
  }
}

class Keccak256 {
  private static readonly ROUNDS = 24;
  private static readonly STATE_BITS = 1600; // 1600 bits
  private static readonly OUTPUT_BYTES = 32; // 256 bits / 8 = 32 bytes
  private static readonly CAPACITY_BYTES = 64; // output length * 2 = 64 bytes = 512 bits
  private static readonly RATE_BYTES = 136; // 1600 bits - 512 bits = 1088 bits / 8 = 136 bytes

  // Round constants for ι (iota) step
  private static readonly ROUND_CONSTANTS = [
    0x0000000000000001n,
    0x0000000000008082n,
    0x800000000000808an,
    0x8000000080008000n,
    0x000000000000808bn,
    0x0000000080000001n,
    0x8000000080008081n,
    0x8000000000008009n,
    0x000000000000008an,
    0x0000000000000088n,
    0x0000000080008009n,
    0x000000008000000an,
    0x000000008000808bn,
    0x800000000000008bn,
    0x8000000000008089n,
    0x8000000000008003n,
    0x8000000000008002n,
    0x8000000000000080n,
    0x000000000000800an,
    0x800000008000000an,
    0x8000000080008081n,
    0x8000000000008080n,
    0x0000000080000001n,
    0x8000000080008008n,
  ];

  // ρ (rho) rotation offsets
  private static readonly RHO_OFFSETS = [
    0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8,
    18, 2, 61, 56, 14,
  ];
  
  /**
   * Main Keccak256 hash function
   * 
   * @note the hash value might differ from the official document since Solidity Keccak256 doesn't apply 01 suffix after message
   */
  static hash(input: string | Uint8Array): string {
    const inputBytes = this.prepareInput(input);
    const paddedInput = this.addPadding(inputBytes);
    const state = this.absorb(paddedInput);
    const output = this.squeeze(state);
    return "0x" + this.bytesToHex(output);
  }

  /**
   * Convert input to bytes
   */
  static prepareInput(input: string | Uint8Array): Uint8Array {
    if (typeof input === "string") {
      // Remove 0x prefix if present
      const cleanHex = input.startsWith("0x") ? input.slice(2) : input;

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
   * Add Keccak padding (10*1 pattern) - bit-level implementation
   */
  static addPadding(input: Uint8Array): Uint8Array {
    const inputBits = Keccak256Utils.bytesToBits(input);
    const paddedBits = this.addPaddingBits(inputBits);
    
    return Keccak256Utils.bitsToBytes(paddedBits);
  }

  /**
   * Add Keccak padding (10*1 pattern) for bit arrays
   */
  static addPaddingBits(inputBits: number[]): number[] {
    const inputBitLength = inputBits.length;
    const rateBits = this.RATE_BYTES * 8; // 136 * 8 = 1088 bits
    
    // Calculate padding length
    const paddingBitLength = rateBits - (inputBitLength % rateBits);
    
    // Create padded bits array
    const paddedBits = new Array(inputBitLength + paddingBitLength).fill(0);
    
    // Copy input bits
    for (let i = 0; i < inputBitLength; i++) {
      paddedBits[i] = inputBits[i];
    }
    
    // Add padding: first bit is 1
    paddedBits[inputBitLength] = 1;
    
    // Last bit is 1
    paddedBits[paddedBits.length - 1] = 1;
    
    return paddedBits;
  }

  /**
   * Absorb phase - process input blocks
   */
  static absorb(input: Uint8Array): BigUint64Array {
    let state: BigUint64Array = new BigUint64Array(this.STATE_BITS / 64);

    // Process each rate-sized block
    for (let offset = 0; offset < input.length; offset += this.RATE_BYTES) {
      const block = input.slice(offset, offset + this.RATE_BYTES);

      // XOR block with state (first 17 lanes for Keccak256)
      for (let i = 0; i < Math.min(block.length, this.RATE_BYTES); i += 8) {
        const laneIndex = Math.floor(i / 8);
        if (laneIndex < 17) {
          // RATE_BYTES / 8 = 17 lanes
          const lane = this.bytesToLane(block, i);
          state[laneIndex] ^= lane;
        }
      }

      // Apply Keccak-f permutation
      state = this.keccakF(state);
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
        state = this.keccakF(state);
      }
    }

    return output;
  }

  /**
   * Keccak-f[1600] permutation
   * Returns a new state without modifying the original
   */
  static keccakF(state: BigUint64Array): BigUint64Array {
    let currentState: BigUint64Array = new BigUint64Array(25);
    currentState.set(state);

    for (let round = 0; round < this.ROUNDS; round++) {
      // θ (theta) step
      currentState = this.theta(currentState);

      // ρ (rho) step
      currentState = this.rho(currentState);

      // π (pi) step
      currentState = this.pi(currentState);

      // χ (chi) step
      currentState = this.chi(currentState);

      // ι (iota) step
      currentState = this.iota(currentState, round);
    }

    return currentState;
  }

  /**
   * θ (theta) step: Column parity computation
   * Returns a new state without modifying the original
   */
  static theta(state: BigUint64Array): BigUint64Array {
    const newState = new BigUint64Array(25);
    newState.set(state);

    const C = new BigUint64Array(5);
    const D = new BigUint64Array(5);

    // Compute column parity
    for (let x = 0; x < 5; x++) {
      C[x] =
        state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }

    // Compute D values
    for (let x = 0; x < 5; x++) {
      D[x] = C[(x + 4) % 5] ^ this.rotateLeft64(C[(x + 1) % 5], 1);
    }

    // Apply theta transformation
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        newState[y * 5 + x] ^= D[x];
      }
    }

    return newState;
  }

  /**
   * ρ (rho) step: Bit rotation
   * Returns a new state without modifying the original
   */
  static rho(state: BigUint64Array): BigUint64Array {
    const newState = new BigUint64Array(25);

    for (let i = 0; i < 25; i++) {
      newState[i] = this.rotateLeft64(state[i], this.RHO_OFFSETS[i]);
    }

    return newState;
  }

  /**
   * π (pi) step: Lane permutation
   * Returns a new state without modifying the original
   */
  static pi(state: BigUint64Array): BigUint64Array {
    const newState = new BigUint64Array(25);

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const temp_x = (x + 3 * y) % 5;
        const temp_y = x;
        newState[5 * y + x] = state[5 * temp_y + temp_x];
      }
    }

    return newState;
  }

  /**
   * χ (chi) step: Non-linear transformation
   * Returns a new state without modifying the original
   */
  static chi(state: BigUint64Array): BigUint64Array {
    const newState = new BigUint64Array(25);

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const i = y * 5 + x;
        const j = y * 5 + ((x + 1) % 5);
        const k = y * 5 + ((x + 2) % 5);
        newState[i] = state[i] ^ (~state[j] & state[k]);
      }
    }

    return newState;
  }

  /**
   * ι (iota) step: Add round constant
   * Returns a new state without modifying the original
   */
  static iota(state: BigUint64Array, round: number): BigUint64Array {
    const newState = new BigUint64Array(25);
    newState.set(state);
    newState[0] ^= this.ROUND_CONSTANTS[round];
    return newState;
  }

  /**
   * 64-bit left rotation
   */
  static rotateLeft64(value: bigint, positions: number): bigint {
    const n = BigInt(positions % 64);
    return ((value << n) | (value >> (64n - n))) & 0xffffffffffffffffn;
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
      bytes[i] = Number((lane >> BigInt(i * 8)) & 0xffn);
    }
    return bytes;
  }

  /**
   * Convert bytes to hex string
   */
  static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
}

class Keccak256Verification {
  static testKeccak256(): boolean {
    let allPassed = true;

    console.log(
      chalk.cyan("\n=== Ether module Keccak256 hash verification ==="),
    );

    const testVectors = [
      "",
      "Hello World",
      "0x48656c6c6f20576f726c64", // "Hello World" in hex
      new Uint8Array([0x00]), // single byte
      "The quick brown fox jumps over the lazy dog", // longer message
    ];

    for (const testVector of testVectors) {
      const input = Keccak256.prepareInput(testVector);
      const expectedDigest = ethers.keccak256(input);
      console.log("Ether:\t\t\t", expectedDigest);

      const actualDigest = Keccak256.hash(input);
      const isEqual = actualDigest == expectedDigest;
      console.log("Our implementation:\t", actualDigest, isEqual ? "✅" : "❌");

      allPassed = allPassed && isEqual;
    }

    return allPassed;
  }

  static runAllTests(): boolean {
    const kecccak256Passed = this.testKeccak256();

    console.log("\n📊 Complete Test Summary:");
    console.log("Keccak256:", kecccak256Passed ? "✅" : "❌");

    const allPassed = kecccak256Passed;

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

export { Keccak256Utils, Keccak256, Keccak256Verification };
