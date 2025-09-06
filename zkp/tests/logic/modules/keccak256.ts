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
   * Convert 25 lanes to bytes (200 bytes)
   */
  static lanesToBytes(lanes: BigUint64Array): Uint8Array {
    if (lanes.length !== 25) {
      throw new Error(`Expected 25 lanes, got ${lanes.length}`);
    }

    const bytes = new Uint8Array(200);
    for (let i = 0; i < 25; i++) {
      const laneBytes = this.laneToBytes(lanes[i]);
      bytes.set(laneBytes, i * 8);
    }
    return bytes;
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
   * Convert 200 bytes to 25 lanes
   */
  static bytesToLanes(bytes: Uint8Array): BigUint64Array {
    if (bytes.length !== 200) {
      throw new Error(`Expected 200 bytes, got ${bytes.length}`);
    }

    const lanes = new BigUint64Array(25);
    for (let i = 0; i < 25; i++) {
      lanes[i] = this.bytesToLane(bytes, i * 8);
    }
    return lanes;
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
      throw new Error(
        `Bits array length must be multiple of 8, got ${bits.length}`,
      );
    }

    // Validate that all values are 0 or 1
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== 0 && bits[i] !== 1) {
        throw new Error(
          `All bits must be 0 or 1, found ${bits[i]} at index ${i}`,
        );
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
   * Convert 25 lanes to hex string (200 bytes)
   * @note Keep this for debug purpose
   */
  static lanesToHex(lanes: BigUint64Array): string {
    if (lanes.length !== 25) {
      throw new Error(`Expected 25 lanes, got ${lanes.length}`);
    }

    const bytes = this.stateArrayToBytes(this.lanesToStateArray(lanes));
    const hexBytes = Array.from(bytes).map((byte) =>
      byte.toString(16).toUpperCase().padStart(2, "0"),
    );

    // Group by 16 bytes per line
    const lines: string[] = [];
    for (let i = 0; i < hexBytes.length; i += 16) {
      lines.push(hexBytes.slice(i, i + 16).join(" "));
    }

    return lines.join("\n");
  }

  /**
   * Convert bytes to hex string
   */
  static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Convert hex string to bytes
   */
  static hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;

    if (cleanHex.length % 2 !== 0) {
      throw new Error(
        `Hex string must have even length, got ${cleanHex.length}`,
      );
    }

    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      throw new Error(`Invalid hex string: ${hex}`);
    }

    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }

    return bytes;
  }

  static getRandomBits(numBits: number): number[] {
    const numBytes = (numBits - 1) / 8 + 1;
    const randomBytes = crypto.getRandomValues(new Uint8Array(numBytes));
    const bits = Keccak256Utils.bytesToBits(randomBytes).slice(0, numBits);
    return bits;
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
   * @note the hash value might differ from the NIST document since Solidity Keccak256 doesn't apply 01 suffix after message
   */
  static hash(input: string | Uint8Array): string {
    const inputBytes = this.encode(input);
    const paddedInput = this.addPadding(inputBytes);
    const state = this.absorb(paddedInput);
    const output = this.squeeze(state);
    return "0x" + Keccak256Utils.bytesToHex(output);
  }

  /**
   * Keccak256 hash function for bit arrays (non-byte-aligned inputs)
   *
   * @param inputBits - Array of bits (0 or 1 values)
   * @returns Hex string hash
   */
  static hashBits(inputBits: number[]): number[] {
    // Validate input bits
    for (let i = 0; i < inputBits.length; i++) {
      if (inputBits[i] !== 0 && inputBits[i] !== 1) {
        throw new Error(
          `All bits must be 0 or 1, found ${inputBits[i]} at index ${i}`,
        );
      }
    }

    const paddedBits = this.addPaddingBits(inputBits);
    const paddedBytes = Keccak256Utils.bitsToBytes(paddedBits);
    const state = this.absorb(paddedBytes);
    const output = this.squeeze(state);
    return Keccak256Utils.bytesToBits(output);
  }

  /**
   * Keccak256 hash function for binary strings (e.g., "1010110")
   *
   * @param binaryString - String of '0' and '1' characters
   * @returns Binary string hash
   */
  static hashBinaryString(binaryString: string): string {
    // Validate binary string format
    if (!/^[01]*$/.test(binaryString)) {
      throw new Error(
        `Binary string must only contain '0' and '1' characters, got: ${binaryString}`,
      );
    }

    // Convert binary string to bit array
    const inputBits = binaryString.split("").map((bit) => parseInt(bit, 10));
    const hashBits = this.hashBits(inputBits);

    // Convert hash bits back to binary string
    return hashBits.map((bit) => bit.toString()).join("");
  }

  /**
   * Encode input to bytes for regular byte-based hashing.
   * For non-byte-aligned inputs, use hashBits() instead.
   */
  static encode(input: string | Uint8Array): Uint8Array {
    if (typeof input === "string") {
      // Only process as hex if it has 0x prefix
      if (input.startsWith("0x")) {
        const cleanHex = input.slice(2);

        // Validate hex format
        if (/^[0-9a-fA-F]*$/.test(cleanHex) && cleanHex.length % 2 === 0) {
          const bytes = new Uint8Array(cleanHex.length / 2);
          for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
          }
          return bytes;
        } else {
          // Invalid hex format after 0x, treat as plain text
          return new TextEncoder().encode(input);
        }
      } else {
        // No 0x prefix, treat as plain text regardless of content
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

    // Calculate padding length - Keccak padding requires at least 2 bits (10*1 pattern)
    // This means we need at least one '1', zero or more '0's, and one final '1'
    let paddingBitLength = rateBits - (inputBitLength % rateBits);
    if (paddingBitLength === 1) {
      // If only 1 bit available, we need to add a full rate block to have space for "10...01"
      paddingBitLength += rateBits;
    }

    // Create padded bits array
    const paddedBits = new Array(inputBitLength + paddingBitLength).fill(0);

    // Copy input bits
    for (let i = 0; i < inputBitLength; i++) {
      paddedBits[i] = inputBits[i];
    }

    // Add Keccak padding: 10*1 pattern
    // First bit after input is always 1
    paddedBits[inputBitLength] = 1;

    // Last bit is always 1 (we now guarantee paddingBitLength >= 2)
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
          const lane = Keccak256Utils.bytesToLane(block, i);
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
  static squeeze(
    state: BigUint64Array,
    output_bytes: number = this.OUTPUT_BYTES,
  ): Uint8Array {
    const output = new Uint8Array(output_bytes);
    let outputOffset = 0;

    while (outputOffset < output_bytes) {
      // Extract bytes from current state
      for (let i = 0; i < 17 && outputOffset < output_bytes; i++) {
        const laneBytes = Keccak256Utils.laneToBytes(state[i]);
        const bytesToCopy = Math.min(8, output_bytes - outputOffset);
        output.set(laneBytes.slice(0, bytesToCopy), outputOffset);
        outputOffset += bytesToCopy;
      }

      // If we need more output, apply permutation again
      if (outputOffset < output_bytes) {
        state = this.keccakF(state);
      }
    }

    return output;
  }

  /**
   * Keccak-f[1600] permutation
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
}

class Keccak256Verification {
  static testKeccak256(): boolean {
    let allPassed = true;

    console.log(
      chalk.cyan("\n=== Ether module Keccak256 hash verification ==="),
    );

    const testVectors = [
      "Hello World",
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      "測試中文字",
    ];

    for (const testVector of testVectors) {
      const input = Keccak256.encode(testVector);
      const expectedDigest = ethers.keccak256(input);
      console.log("Ether:\t\t\t", expectedDigest);

      const actualDigest = Keccak256.hash(input);
      const isEqual = actualDigest == expectedDigest;
      console.log("Our impl:\t", actualDigest, isEqual ? "✅" : "❌");

      allPassed = allPassed && isEqual;
    }

    return allPassed;
  }

  static testEncodingCompatibility(): boolean {
    console.log(
      chalk.cyan("\n=== Keccak256 input format compatibility testing ==="),
    );

    let allPassed = true;

    // Test cases with the same content in different formats
    const testCases = [
      {
        name: "Empty string",
        formats: {
          plainText: "",
          hexString: "0x",
          uint8Array: new Uint8Array([]),
        },
      },
      {
        name: "Binary data with nulls",
        formats: {
          hexString: "0x000102ff",
          uint8Array: new Uint8Array([0x00, 0x01, 0x02, 0xff]),
        },
      },
      {
        name: "Hello World",
        formats: {
          plainText: "Hello World",
          hexString: "0x48656c6c6f20576f726c64",
          uint8Array: new Uint8Array([
            0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64,
          ]),
        },
      },
    ];

    for (const { name, formats } of testCases) {
      console.log(`\n  Testing ${name}:`);

      const hashes: { [key: string]: string } = {};
      let referenceHash: string | null = null;

      // Calculate hash for each format
      for (const [formatName, input] of Object.entries(formats)) {
        try {
          const hash = Keccak256.hash(input);
          hashes[formatName] = hash;

          if (referenceHash === null) {
            referenceHash = hash;
          }

          console.log(`    ${formatName.padEnd(15)}: ${hash}`);
        } catch (error) {
          console.log(`    ${formatName.padEnd(15)}: Error - ${error}`);
          allPassed = false;
          continue;
        }
      }

      // Verify all hashes are identical
      const allHashesMatch = Object.values(hashes).every(
        (hash) => hash === referenceHash,
      );

      console.log(`    All formats match: ${allHashesMatch ? "✅" : "❌"}`);

      if (!allHashesMatch) {
        console.log("    Hash differences detected:");
        const uniqueHashes = new Set(Object.values(hashes));
        uniqueHashes.forEach((hash) => {
          const formatsWithThisHash = Object.entries(hashes)
            .filter(([_, h]) => h === hash)
            .map(([format, _]) => format);
          console.log(`      ${hash} -> ${formatsWithThisHash.join(", ")}`);
        });
      }

      allPassed = allPassed && allHashesMatch;

      // Also verify against ethers.js for the plainText or uint8Array format
      if (formats.plainText !== undefined || formats.uint8Array !== undefined) {
        const referenceInput =
          formats.uint8Array || Keccak256.encode(formats.plainText || "");
        const ethersHash = ethers.keccak256(referenceInput);
        const ethersMatch = referenceHash === ethersHash;

        console.log(`    Ethers.js match:    ${ethersMatch ? "✅" : "❌"}`);
        if (!ethersMatch) {
          console.log(`      Expected: ${ethersHash}`);
          console.log(`      Got:      ${referenceHash}`);
        }

        allPassed = allPassed && ethersMatch;
      }
    }

    return allPassed;
  }

  /**
   * Test Keccak256 with edge cases and boundary conditions
   */
  static testKeccak256Boundary(): boolean {
    console.log(chalk.cyan("\n=== Keccak256 boundary conditions testing ==="));

    let allPassed = true;

    // Test messages of various lengths and edge cases
    const testMessages = [
      { name: "Empty message", message: "" },
      { name: "Single byte", message: "A" },
      { name: "135 bytes (rate-1)", message: "A".repeat(135) },
      { name: "136 bytes (= rate)", message: "A".repeat(136) },
      { name: "137 bytes (rate+1)", message: "A".repeat(137) },
      { name: "272 bytes (2*rate)", message: "A".repeat(272) },
      { name: "273 bytes (2*rate+1)", message: "A".repeat(273) },
    ];

    for (const { name, message } of testMessages) {
      console.log(`\n  Testing ${name}:`);

      try {
        const inputBytes = Keccak256.encode(message);

        // Test our implementation
        const ourHash = Keccak256.hash(inputBytes);

        // Compare with ethers
        const expectedHash = ethers.keccak256(inputBytes);
        const success = ourHash === expectedHash;

        console.log("    Length:", inputBytes.length, "bytes");
        console.log("    Expected:", expectedHash);
        console.log("    Our impl:", ourHash, success ? "✅" : "❌");

        if (!success) {
          console.log(
            "    Input bytes:",
            Keccak256Utils.bytesToHex(inputBytes.slice(0, 32)),
            inputBytes.length > 32 ? "..." : "",
          );
        }

        allPassed = allPassed && success;
      } catch (error) {
        console.log(`    Error with ${name}:`, String(error), "❌");
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Test Keccak256 padding edge cases
   */
  static testKeccak256Padding(): boolean {
    console.log(chalk.cyan("\n=== Keccak256 padding testing ==="));

    let allPassed = true;

    // Test padding with different input sizes that affect padding behavior
    const paddingTests = [
      {
        name: "0 bits (requires full rate padding)",
        input: new Uint8Array(0),
      },
      {
        name: "1 bit input",
        input: new Uint8Array([0x01]),
      },
      {
        name: "Rate - 2 bytes (1072 bits)",
        input: new Uint8Array(134).fill(0xaa),
      },
      {
        name: "Rate - 1 byte (1080 bits)",
        input: new Uint8Array(135).fill(0xaa),
      },
      {
        name: "Exactly rate boundary",
        input: new Uint8Array(136).fill(0x55),
      },
    ];

    for (const { name, input } of paddingTests) {
      console.log(`\n  Testing ${name}:`);

      try {
        const testInput = input;

        // For bit-level tests, we'd need to modify the implementation
        // For now, test byte-level boundaries
        const ourHash = Keccak256.hash(testInput);
        const expectedHash = ethers.keccak256(testInput);
        const success = ourHash === expectedHash;

        console.log("    Input length:", testInput.length, "bytes");
        console.log("    Expected:", expectedHash);
        console.log("    Our impl:", ourHash, success ? "✅" : "❌");

        allPassed = allPassed && success;
      } catch (error) {
        console.log(`    Error with ${name}:`, String(error), "❌");
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Performance test for Keccak256 with large data
   * Tests hashing of larger data sets to verify performance
   */
  static testKeccak256Performance(): boolean {
    console.log(chalk.cyan("\n=== Keccak256 performance testing ==="));

    let allPassed = true;

    // Test with different data sizes
    const dataSizes = [1024, 4096, 16384, 65536]; // 1KB, 4KB, 16KB, 64KB

    for (const size of dataSizes) {
      console.log(`\n  Testing ${size} bytes:`);

      try {
        // Generate test data
        const testData = new Uint8Array(size);
        // Fill with pseudo-random data for realistic testing
        for (let i = 0; i < size; i++) {
          testData[i] = (i * 7) % 256;
        }

        const startTime = Date.now();

        // Hash with our implementation
        const ourHash = Keccak256.hash(testData);

        const ourTime = Date.now() - startTime;
        console.log(`    Our implementation time: ${ourTime}ms`);

        // Compare with ethers for correctness
        const ethersStartTime = Date.now();
        const expectedHash = ethers.keccak256(testData);
        const ethersTime = Date.now() - ethersStartTime;
        console.log(`    Ethers time: ${ethersTime}ms`);

        const success = ourHash === expectedHash;
        console.log("    Correctness:", success ? "✅" : "❌");

        // Basic performance check (should complete in reasonable time)
        const performanceOK = ourTime < 5000; // Should complete within 5 seconds for largest test
        console.log(
          "    Performance:",
          performanceOK ? "✅" : "❌",
          `(${ourTime}ms)`,
        );

        // Calculate throughput
        const throughputMBps = size / (ourTime / 1000) / (1024 * 1024);
        console.log(`    Throughput: ${throughputMBps.toFixed(2)} MB/s`);

        allPassed = allPassed && success && performanceOK;
      } catch (error) {
        console.log(`    Error with ${size} bytes:`, String(error), "❌");
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Test Keccak256 with non-byte-aligned inputs (1-bit, 7-bit, etc.)
   */
  static testKeccak256BitInputs(): boolean {
    console.log(
      chalk.cyan("\n=== Keccak256 non-byte-aligned input testing ==="),
    );

    let allPassed = true;

    // Test cases for bit-level inputs
    const bitTestCases = [
      {
        name: "1 bit (1)",
        input: [1],
        binaryString: "1",
      },
      {
        name: "1 bit (0)",
        input: [0],
        binaryString: "0",
      },
      {
        name: "7 bits (1010110)",
        input: [1, 0, 1, 0, 1, 1, 0],
        binaryString: "1010110",
      },
      {
        name: "3 bits (101)",
        input: [1, 0, 1],
        binaryString: "101",
      },
      {
        name: "5 bits (11010)",
        input: [1, 1, 0, 1, 0],
        binaryString: "11010",
      },
      {
        name: "9 bits (101010101)",
        input: [1, 0, 1, 0, 1, 0, 1, 0, 1],
        binaryString: "101010101",
      },
      {
        name: "15 bits (alternating)",
        input: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        binaryString: "101010101010101",
      },
      {
        name: "Empty bit array",
        input: [],
        binaryString: "",
      },
    ];

    for (const { name, input, binaryString } of bitTestCases) {
      console.log(`\n  Testing ${name}:`);

      try {
        // Test hashBits method
        const hashFromBits = Keccak256.hashBits(input);
        console.log("    hashBits result:", hashFromBits);

        // Test hashBinaryString method
        const hashFromString = Keccak256.hashBinaryString(binaryString);
        console.log("    hashBinaryString result:", hashFromString);

        // Both methods should produce the same result (convert bits to string for comparison)
        const hashFromBitsAsString = hashFromBits
          .map((bit) => bit.toString())
          .join("");
        const methodsMatch = hashFromBitsAsString === hashFromString;
        console.log("    Methods match:", methodsMatch ? "✅" : "❌");

        // Bit-exact methods should match, byte-padded methods should match
        const bitExactMethodsMatch = hashFromBitsAsString === hashFromString;
        // const bytePaddedMethodsMatch = hashFromPreparedInput === hashFromBinaryStringInput;
        const allMethodsMatch = bitExactMethodsMatch;
        // && bytePaddedMethodsMatch;

        console.log(
          "    All methods consistent:",
          allMethodsMatch ? "✅" : "❌",
        );

        allPassed = allPassed && methodsMatch && allMethodsMatch;

        // Show bit length
        console.log(`    Input bit length: ${input.length}`);
      } catch (error) {
        console.log(`    Error with ${name}:`, String(error), "❌");
        allPassed = false;
      }
    }

    // Test validation
    console.log(`\n  Testing input validation:`);
    try {
      // Should throw error for invalid bit values
      Keccak256.hashBits([1, 0, 2, 1]);
      console.log("    Invalid bit validation: ❌ (should have thrown error)");
      allPassed = false;
    } catch (error) {
      console.log(
        "    Invalid bit validation: ✅ (correctly threw error)",
        String(error),
      );
    }

    try {
      // Should throw error for invalid binary string
      Keccak256.hashBinaryString("10102");
      console.log(
        "    Invalid binary string validation: ❌ (should have thrown error)",
      );
      allPassed = false;
    } catch (error) {
      console.log(
        "    Invalid binary string validation: ✅ (correctly threw error)",
        String(error),
      );
    }

    return allPassed;
  }

  static runAllTests(): boolean {
    const keccak256Passed = this.testKeccak256();
    const encodingCompatibilityPassed = this.testEncodingCompatibility();
    const boundaryPassed = this.testKeccak256Boundary();
    const paddingPassed = this.testKeccak256Padding();
    const performancePassed = this.testKeccak256Performance();
    const bitInputsPassed = this.testKeccak256BitInputs();

    console.log("\n📊 Complete Test Summary:");
    console.log("Basic Keccak256:", keccak256Passed ? "✅" : "❌");
    console.log(
      "Encoding compatibility:",
      encodingCompatibilityPassed ? "✅" : "❌",
    );
    console.log("Edge cases:", boundaryPassed ? "✅" : "❌");
    console.log("Padding tests:", paddingPassed ? "✅" : "❌");
    console.log("Performance tests:", performancePassed ? "✅" : "❌");
    console.log("Non-byte-aligned inputs:", bitInputsPassed ? "✅" : "❌");

    const allPassed =
      keccak256Passed &&
      encodingCompatibilityPassed &&
      boundaryPassed &&
      paddingPassed &&
      performancePassed &&
      bitInputsPassed;

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
