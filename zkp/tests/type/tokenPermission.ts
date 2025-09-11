import { Address } from "./address.js";

type TokenPermission = {
  token: Address;
  amount: bigint;
};

export type { TokenPermission };
