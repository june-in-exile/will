import { Address } from "./address.js";

type Estate = {
    beneficiary: Address,
    token: Address,
    amount: bigint
};

export type { Estate };