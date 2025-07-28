import { Byte4 } from "./byte.js";
import { Bit4 } from "./bit.js";

type Utf8 = {
    bytes: Byte4;
    validBytes: Bit4;
};

export type { Utf8 };