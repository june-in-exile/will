import {
  Byte,
  TokenPermission,
  Address,
  Nonce,
  Timestamp,
} from "../type/index.js";
import { hexToByte } from "../util/conversion.js";
import { Permit2 } from "./index.js";

function hashPermit(
  tokenPermissions: TokenPermission[],
  nonce: Nonce,
  deadline: Timestamp,
  spender: Address,
): Byte[] {
  const digest = Permit2.hashPermit(
    tokenPermissions.map((tokenPermission) => ({
      token: "0x" + tokenPermission.token.toString(16),
      amount: tokenPermission.amount,
    })),
    nonce,
    deadline,
    spender.toString(16),
  );
  return hexToByte(digest);
}

export { hashPermit };
