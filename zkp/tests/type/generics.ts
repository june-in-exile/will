type Range<
    N extends number,
    Result extends Array<unknown> = [],
> = Result["length"] extends N
    ? Result
    : Range<N, [...Result, Result["length"]]>;

type Tuple<T, N extends number, R extends T[] = []> =
    R['length'] extends N ? R : Tuple<T, N, [T, ...R]>;

export type { Range, Tuple };