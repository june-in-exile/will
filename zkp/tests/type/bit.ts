import { Range, Tuple } from "./generics.js";

type Bit = Range<2>[number];
type Bit2 = Tuple<Bit, 2>;
type Bit4 = Tuple<Bit, 4>;

export type { Bit, Bit2, Bit4 };
