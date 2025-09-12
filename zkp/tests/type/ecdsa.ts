import { Byte, Uint256 } from "./index.js";

type EcdsaSignature = {
    r: Uint256,
    s: Uint256,
    v: Byte,
};

type EcdsaPoint = {
    x: Uint256;
    y: Uint256;
};

export type { EcdsaSignature, EcdsaPoint };
