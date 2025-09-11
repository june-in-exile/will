import { Nonce, Timestamp, TokenPermission } from "./index.js";

type PermitTransferFrom = {
  permitted: TokenPermission[];
  nonce: Nonce;
  deadline: Timestamp;
};

export type { PermitTransferFrom };
