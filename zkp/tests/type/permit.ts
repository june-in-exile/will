import { Address, Nonce, Timestamp } from "./index.js";

type TokenPermission = {
  token: Address;
  amount: bigint;
};

type PermitTransferFrom = {
  permitted: TokenPermission[];
  nonce: Nonce;
  deadline: Timestamp;
};

export type { TokenPermission, PermitTransferFrom };
