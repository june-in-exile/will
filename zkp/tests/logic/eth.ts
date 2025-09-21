import { Bit, Uint256, Address } from "../type/index.js";
import {
  bigIntToByte,
  byteToBit,
  bitToByte,
  byteToBigInt,
  concatBigInts,
} from "../util/conversion.js";
import { Permit2 } from "./index.js";

function flattenPubkey(chunkedPubkey: Uint256[]): Bit[] {
  if (chunkedPubkey.length !== 2) {
    throw new Error(
      `Invalid ECDSA point format: ${chunkedPubkey.length} Uint256`,
    );
  }
  const pubkeyBits: Bit[] = [];
  // Fill in y coordinate first and x coordinate second
  for (let i = 1; i >= 0; i--) {
    for (let j = 0; j < 4; j++) {
      // Converts bigint to 8 bytes (little-endian)
      const bytes = bigIntToByte(chunkedPubkey[i][j], 8, false);
      if (bytes.length !== 8) {
        throw new Error(
          `Invalid ECDSA point byte length: ${bytes.length} bytes in y[${j}]`,
        );
      }
      // Converts 8 bytes to 64 bits (LSB-first)
      const bits = byteToBit(bytes);
      pubkeyBits.push(...bits);
    }
  }
  return pubkeyBits;
}

function pubkeyToAddress(pubkeyBits: Bit[]): Address {
  if (pubkeyBits.length !== 512) {
    throw new Error(`Invalid bits length: ${pubkeyBits.length}`);
  }
  // Convert 512 bits to 64 bytes (LSB-first)
  const pubkeyBytes = bitToByte(pubkeyBits);
  const uint64Array: bigint[] = [];
  // Convert 64 bytes to 8*64-bit bigint (little-endian)
  for (let i = 0; i < 8; i++) {
    uint64Array.push(byteToBigInt(pubkeyBytes.slice(i * 8, i * 8 + 8), false));
  }
  // Concat 4*64-bit bigint to get x, y coordinates
  const publicKey = {
    x: concatBigInts(uint64Array.slice(4, 8)),
    y: concatBigInts(uint64Array.slice(0, 4)),
  };
  const address = Permit2.publicKeyToAddress(publicKey);
  return BigInt(address);
}

export { flattenPubkey, pubkeyToAddress };
