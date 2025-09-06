import { Bit, Byte, Byte4, Word, Point } from "../type/index.js";

/**
 * @param bytes - Byte array (length should be a multiple of 4)
 * @returns Word[]
 */
function byteToWord(bytes: Byte[]): Word[] {
  if (bytes.length % 4 !== 0) {
    throw new Error("Length of keyBytes must be a multiple of 4");
  }
  const words: Word[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    const chunk = bytes.slice(i, i + 4);
    words.push({
      bytes: chunk as Byte4,
    });
  }
  return words;
}

/**
 * @param words - Word array
 * @returns Flattened Byte array
 */
function wordToByte(words: Word[]): Byte[] {
  const bytes: Byte[] = [];
  for (const word of words) {
    bytes.push(...word.bytes);
  }
  return bytes;
}

/**
 * @param buffer - Buffer of bytes (length should be a multiple of 4)
 * @returns Word[]
 */
function bufferToWord(buffer: Buffer): Word[] {
  if (buffer.length % 4 !== 0) {
    throw new Error("Length of buffer must be a multiple of 4");
  }
  const words: Word[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    const chunk = buffer.subarray(i, i + 4);
    words.push({
      bytes: Array.from(chunk) as Byte4,
    });
  }
  return words;
}

/**
 * @param words - Word array
 * @returns A Buffer containing the concatenated bytes
 */
function wordToBuffer(words: Word[]): Buffer {
  const byteArray: number[] = [];
  for (const word of words) {
    byteArray.push(...word.bytes);
  }
  return Buffer.from(byteArray);
}

/**
 * Convert hex string to bytes
 */
function hexToByte(hex: string): Byte[] {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;

  if (cleanHex.length % 2 !== 0) {
    throw new Error(`Hex string must have even length, got ${cleanHex.length}`);
  }

  const bytes = new Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes as Byte[];
}

/**
 * Convert bytes to hex string
 */
function byteToHex(bytes: Byte[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Convert bigint to bytes
 */
function bigIntToByte(val: bigint): Byte[] {
  if (val < 0n) {
    throw new Error("BigInt value must be non-negative");
  }

  if (val === 0n) {
    return [0] as Byte[];
  }

  const hex = val.toString(16);
  const paddedHex = hex.length % 2 === 0 ? hex : "0" + hex;
  return hexToByte(paddedHex);
}

/**
 * Convert bytes to bigint
 */
function byteToBigInt(bytes: Byte[]): bigint {
  const hex = byteToHex(bytes);
  return BigInt(hex);
}

/**
 * Convert bytes to bits array (each byte becomes 8 bits)
 */
function byteToBit(bytes: Byte[]): Bit[] {
  const bits: Bit[] = [];

  for (const byte of bytes) {
    // Extract each bit from the byte (LSB first)
    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const bit = (byte >> bitIdx) & 1;
      bits.push(bit as Bit);
    }
  }

  return bits;
}

/**
 * Convert bits array to bytes (every 8 bits becomes 1 byte)
 */
function bitToByte(bits: Bit[]): Byte[] {
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

  const bytes: Byte[] = [];

  for (let byteIdx = 0; byteIdx < bits.length / 8; byteIdx++) {
    let byteValue = 0;

    // Combine 8 bits into a byte (LSB first)
    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const bit = bits[byteIdx * 8 + bitIdx];
      byteValue |= bit << bitIdx;
    }

    bytes.push(byteValue as Byte);
  }

  return bytes;
}

/**
 * Concatenates BigInts assuming LSB-First format (values[0] is least significant)
 */
function concatBigInts(values: bigint[], bitWidth: number = 64): bigint {
  let result = 0n;
  const shift = BigInt(bitWidth);

  // Process from most significant to least significant (reverse order)
  for (let i = values.length - 1; i >= 0; i--) {
    result = (result << shift) | values[i];
  }

  return result;
}

/**
 * Splits a large BigInt into an array of smaller BigInts
 * This is the reverse operation of concatBigInts
 *
 * @param value - The large BigInt to split
 * @param options - Configuration options
 * @returns Array of BigInts representing the split components
 */
function splitBigInt(
  value: bigint,
  options: number | { numParts?: number; bitWidth?: number; modulus?: bigint } = {}
): bigint[] {
  const { numParts = typeof options === 'number' ? options : 4,
    bitWidth = 64,
    modulus } = typeof options === 'number' ? {} : options;

  const mask = (1n << BigInt(bitWidth)) - 1n;

  let normalizedValue = modulus
    ? ((value % modulus) + modulus) % modulus // handle negatives
    : value;

  return Array.from({ length: numParts }, () => {
    const part = normalizedValue & mask;
    normalizedValue >>= BigInt(bitWidth);
    return part;
  });
}

/**
 * Converts pubkey format to Point
 * @param pubkey - Array of [x_components, y_components] where each component is 4 BigInts
 * @returns Point with concatenated x and y coordinates
 */
function bigIntsToPoint(pubkey: bigint[][]): Point {
  if (pubkey.length !== 2) {
    throw new Error("Pubkey must have exactly 2 components [x, y]");
  }

  const [xComponents, yComponents] = pubkey;

  if (xComponents.length !== 4 || yComponents.length !== 4) {
    throw new Error("Each coordinate must have exactly 4 BigInt components");
  }

  // Concatenate x components (4 * 64-bit = 256-bit)
  const x = concatBigInts(xComponents, 64);

  // Concatenate y components (4 * 64-bit = 256-bit)
  const y = concatBigInts(yComponents, 64);

  return {
    x,
    y,
    isInfinity: false,
  };
}

/**
 * Converts a Point back to pubkey format
 * This is the reverse operation of pubkeyToPoint
 *
 * @param point - Point with x, y coordinates
 * @param options - Configuration options
 * @returns Array of [x_components, y_components]
 */
function pointToBigInts(
  point: Point,
  options?: {
    componentsPerCoordinate?: number;
    bitWidth?: number;
    modulus?: bigint;
  },
): bigint[][];

/**
 * Legacy overload for backward compatibility
 * @deprecated Use the options object form instead
 */
function pointToBigInts(
  point: Point,
  componentsPerCoordinate?: number,
  bitWidth?: number,
  modulus?: bigint,
): bigint[][];

function pointToBigInts(
  point: Point,
  componentsPerCoordinateOrOptions?: number | { componentsPerCoordinate?: number; bitWidth?: number; modulus?: bigint },
  bitWidth?: number,
  modulus?: bigint,
): bigint[][] {
  // Handle both new options form and legacy parameters
  let actualComponentsPerCoordinate: number;
  let actualBitWidth: number;
  let actualModulus: bigint | undefined;

  if (typeof componentsPerCoordinateOrOptions === 'object' && componentsPerCoordinateOrOptions !== null) {
    // New options form
    actualComponentsPerCoordinate = componentsPerCoordinateOrOptions.componentsPerCoordinate ?? 4;
    actualBitWidth = componentsPerCoordinateOrOptions.bitWidth ?? 64;
    actualModulus = componentsPerCoordinateOrOptions.modulus;
  } else {
    // Legacy form
    actualComponentsPerCoordinate = (componentsPerCoordinateOrOptions as number) ?? 4;
    actualBitWidth = bitWidth ?? 64;
    actualModulus = modulus;
  }

  // Handle point at infinity
  if (point.isInfinity) {
    const zeroComponents = new Array(actualComponentsPerCoordinate).fill(0n);
    return [zeroComponents, zeroComponents];
  }

  // Split coordinates into components, handling negative values with modulus
  const xComponents = splitBigInt(point.x, {
    numParts: actualComponentsPerCoordinate,
    bitWidth: actualBitWidth,
    modulus: actualModulus,
  });
  const yComponents = splitBigInt(point.y, {
    numParts: actualComponentsPerCoordinate,
    bitWidth: actualBitWidth,
    modulus: actualModulus,
  });

  return [xComponents, yComponents];
}

export {
  byteToWord,
  wordToByte,
  bufferToWord,
  wordToBuffer,
  hexToByte,
  byteToHex,
  bigIntToByte,
  byteToBigInt,
  byteToBit,
  bitToByte,
  concatBigInts,
  splitBigInt,
  bigIntsToPoint,
  pointToBigInts,
};
