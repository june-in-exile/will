import { Bit, Uint256, Address, EcdsaSignature, PermitTransferFrom } from "../type/index.js";
import { byteToHex, hexToByte, splitBigInt, byteToBit, bitToByte, concatBigInts } from "../util/index.js";
import { Permit2 } from "./index.js";

function hashPermit(permit: PermitTransferFrom, spender: Address): Bit[] {
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
  return byteToBit(hexToByte(digest));
}

function hashTypedData(permitDigest: Bit[], chainId: number = 421614): Bit[] {
  const hexPermitDigest = '0x' + byteToHex(bitToByte(permitDigest));
  const typedPermitDigest = Permit2.hashTypedData(hexPermitDigest, chainId);
  return byteToBit(hexToByte(typedPermitDigest));
}

function recoverPublicKey(signature: EcdsaSignature, digest: Bit[]): Uint256[] {
  const recoveredPublicKey = Permit2.recoverPublicKey(
    byteToHex(bitToByte(digest)),
    concatBigInts(signature.r),
    concatBigInts(signature.s),
    signature.v,
  );
  return [splitBigInt(recoveredPublicKey.x), splitBigInt(recoveredPublicKey.y)]
}

export { hashPermit, hashTypedData, recoverPublicKey };
