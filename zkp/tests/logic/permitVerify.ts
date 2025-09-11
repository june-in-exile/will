import { Byte, Address, Byte32, PermitTransferFrom } from "../type/index.js";
import { byteToHex, hexToByte } from "../util/index.js";
import { Permit2 } from "./index.js";

function hashPermit(permit: PermitTransferFrom, spender: Address): Byte32 {
  const permitted = permit.permitted.map((tokenPermission) => ({
    token: "0x" + tokenPermission.token.toString(16),
    amount: tokenPermission.amount,
  }));
  const nonce = permit.nonce;
  const deadline = permit.deadline;

  const digest = Permit2.hashPermit(
    {
      permitted,
      nonce,
      deadline,
    },
    spender.toString(16),
  );
  const digestBytes: Byte[] = hexToByte(digest);
  if (digestBytes.length !== 32) {
    throw new Error("Invalid digest length");
  }
  return digestBytes as Byte32;
}

function hashTypedData(permitDigest: Byte32, chainId: number = 421614): Byte32 {
  const hexTypedPermitDigest = Permit2.hashTypedData('0x' + byteToHex(permitDigest), chainId);
  const typedPermitDigest = hexToByte(hexTypedPermitDigest);
  if (typedPermitDigest.length !== 32) {
    throw new Error("Invalid digest length");
  }
  return typedPermitDigest as Byte32;
}

export { hashPermit, hashTypedData };
