import { Range, Tuple } from "./generics.js";

type Byte = Range<256>[number];
type Byte4 = Tuple<Byte, 4>;
type Byte12 = Tuple<Byte, 12>;
type Byte16 = Tuple<Byte, 16>;
type Byte32 = Tuple<Byte, 32>;

export type { Byte, Byte4, Byte12, Byte16, Byte32 };
