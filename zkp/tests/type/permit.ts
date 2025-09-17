import { Address, Nonce, Timestamp } from "./index.js";

type TokenPermission = {
  token: Address;
  amount: bigint;
};

type PermitBatchTransferFrom = {
  permitted: TokenPermission[];
  nonce: Nonce;
  deadline: Timestamp;
};

export type { TokenPermission, PermitBatchTransferFrom };
