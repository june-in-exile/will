import {
  Byte,
  TokenPermission,
  Address,
  Nonce,
  Timestamp,
  Byte32,
} from "../type/index.js";
import { byteToHex, hexToByte } from "../util/index.js";
import { Permit2 } from "./index.js";

function hashPermit(
  tokenPermissions: TokenPermission[],
  nonce: Nonce,
  deadline: Timestamp,
  spender: Address,
): Byte32 {
  const digest = Permit2.hashPermit(
    tokenPermissions.map((tokenPermission) => ({
      token: "0x" + tokenPermission.token.toString(16),
      amount: tokenPermission.amount,
    })),
    nonce,
    deadline,
    spender.toString(16),
  );
  const digestBytes: Byte[] = hexToByte(digest);
  if (digestBytes.length !== 32) {
    throw new Error("Invalid digest length");
  }
  return digestBytes as Byte32;
}

function hashTypedData(permitDigest: Byte32): Byte32 {
  const hexTypedPermitDigest = Permit2.hashTypedData(byteToHex(permitDigest));
  const typedPermitDigest = hexToByte(hexTypedPermitDigest);
  if (typedPermitDigest.length !== 32) {
    throw new Error("Invalid digest length");
  }
  return typedPermitDigest as Byte32;
}

export { hashPermit, hashTypedData };
