import { Tuple } from "./generics.js";
import { Byte4 } from "./byte.js";

type Word = { bytes: Byte4 };
type Word4 = Tuple<Word, 4>;

export type { Word, Word4 };