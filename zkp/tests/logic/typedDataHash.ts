import { Bit } from "../type/index.js";
import { byteToHex, hexToByte, byteToBit, bitToByte } from "../util/index.js";
import { Permit2 } from "./index.js";

function hashTypedData(permitDigest: Bit[], chainId: number = 31337): Bit[] {
  const hexPermitDigest = "0x" + byteToHex(bitToByte(permitDigest));
  const typedPermitDigest = Permit2.hashTypedData(hexPermitDigest, chainId);
  return byteToBit(hexToByte(typedPermitDigest));
}

export { hashTypedData };
