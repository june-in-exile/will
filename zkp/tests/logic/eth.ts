import { Bit, Uint256 } from "../type/index.js";
import { bigIntToByte, byteToBit } from "../util/conversion.js";

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

export { flattenPubkey };
