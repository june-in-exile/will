import {
  Bit,
  Byte,
  Byte4,
  Word,
  EcdsaPoint,
  ConcatedEcdsaPoint,
  Estate,
  TokenPermission,
  PermitTransferFrom,
  Uint256,
} from "../type/index.js";
import { assert } from "console";

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
function hexToByte(hex: string, numBytes?: number): Byte[] {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;

  if (cleanHex.length % 2 !== 0) {
    throw new Error(`Hex string must have even length, got ${cleanHex.length}`);
  }

  const bytes = new Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }

  const result = bytes as Byte[];

  if (numBytes) {
    if (result.length > numBytes) {
      throw new Error(
        `Hex string requires ${result.length} bytes but only ${numBytes} bytes allowed`,
      );
    }
    // Pad with zeros at the beginning if needed
    const paddedBytes = new Array(numBytes).fill(0) as Byte[];
    paddedBytes.splice(-result.length, result.length, ...result);
    return paddedBytes;
  }

  return result;
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
function bigIntToByte(val: bigint, numBytes?: number): Byte[] {
  if (val < 0n) {
    throw new Error("BigInt value must be non-negative");
  }

  if (val === 0n) {
    if (numBytes) {
      return new Array(numBytes).fill(0) as Byte[];
    }
    return [0] as Byte[];
  }

  const hex = val.toString(16);
  const paddedHex = hex.length % 2 === 0 ? hex : "0" + hex;
  return hexToByte(paddedHex, numBytes);
}

/**
 * Convert bytes to bigint
 */
function byteToBigInt(bytes: Byte[]): bigint {
  const hex = byteToHex(bytes);
  return BigInt("0x" + hex);
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
 * Concatenates BigInts assuming little-endian
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
 * Splits a large BigInt into an array of smaller BigInts, little-endian
 * This is the reverse operation of concatBigInts
 *
 * @param value - The large BigInt to split
 * @param options - Configuration options
 * @returns Array of BigInts representing the split components
 */
function splitBigInt(
  value: bigint,
  options:
    | number
    | { numParts?: number; bitWidth?: number; modulus?: bigint } = {},
): bigint[] {
  const {
    numParts = typeof options === "number" ? options : 4,
    bitWidth = 64,
    modulus,
  } = typeof options === "number" ? {} : options;

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
 * Converts 2D bigint format to EcdsaPoint
 * @param pubkey - Array of [x_components, y_components] where each component is 4 BigInts
 * @param concat - Concat the x_components, x_components in EcdsaPoint or keep them as bigint[]
 */
function bigIntsToEcdsaPoint(
  pubkey: bigint[][],
  concat: boolean = true,
): ConcatedEcdsaPoint | EcdsaPoint {
  if (pubkey.length !== 2) {
    throw new Error("Pubkey must have exactly 2 components [x, y]");
  }

  const [x, y] = pubkey;

  if (x.length !== 4 || y.length !== 4) {
    throw new Error("Each coordinate must have exactly 4 BigInt components");
  }

  return concat
    ? ({
      x: concatBigInts(x) as bigint,
      y: concatBigInts(y) as bigint,
      isInfinity: false,
    } as ConcatedEcdsaPoint)
    : ({
      x: x as Uint256,
      y: y as Uint256,
      isInfinity: false,
    } as EcdsaPoint);
}

/**
 * Converts a EcdsaPoint back to 2D bigint format
 * This is the reverse operation of bigIntsToEcdsaPoint
 */
function ecdsaPointToBigInts(
  point: ConcatedEcdsaPoint | EcdsaPoint,
): bigint[][] {
  // ConcatedEcdsaPoint
  if (typeof point.x == "bigint" && typeof point.y == "bigint") {
    return [splitBigInt(point.x), splitBigInt(point.y)];
  }

  // EcdsaPoint
  const x = point.x as Uint256;
  const y = point.y as Uint256;
  if (x.length != 4 || y.length != 4) {
    throw new Error("Invalid ECDSA point format");
  }

  return [x, y];
}

/**
 * Convert from string to Point
 */
function hexToPoint(publicKeyHex: string): ConcatedEcdsaPoint {
  const cleanHex = publicKeyHex.startsWith("0x")
    ? publicKeyHex.slice(2)
    : publicKeyHex;

  assert(/^[0-9a-fA-F]+$/.test(cleanHex));

  const prefix = cleanHex.slice(0, 2);
  assert(prefix == "04"); // Handle uncompressed key only

  const coordData = cleanHex.slice(2);

  return {
    x: BigInt("0x" + coordData.slice(0, 64)),
    y: BigInt("0x" + coordData.slice(64, 128)),
    isInfinity: false,
  };
}

/**
 * Flatten Estate for circom_tester
 */
function flattenEstates(estates: Estate[]): bigint[] {
  return estates.flatMap((estate) => [
    estate.beneficiary,
    estate.token,
    estate.amount,
  ]);
}

/**
 * Flatten TokenPermissions for circom_tester
 */
function flattenTokenPermissions(
  tokenPermissions: TokenPermission[],
): bigint[] {
  return tokenPermissions.flatMap((permission) => [
    permission.token,
    permission.amount,
  ]);
}

/**
 * Flatten PermitTransferFrom for circom_tester
 */
function flattenPermitTransferFrom(permit: PermitTransferFrom): bigint[] {
  return [
    ...permit.permitted.flatMap((p) => [p.token, p.amount]),
    permit.nonce,
    BigInt(permit.deadline),
  ];
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
  bigIntsToEcdsaPoint,
  ecdsaPointToBigInts,
  hexToPoint,
  flattenEstates,
  flattenTokenPermissions,
  flattenPermitTransferFrom,
};
