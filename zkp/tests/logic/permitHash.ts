import {
  Bit,
  Address,
  PermitTransferFrom,
} from "../type/index.js";
import {
  hexToByte,
  byteToBit,
} from "../util/index.js";
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

export { hashPermit };
