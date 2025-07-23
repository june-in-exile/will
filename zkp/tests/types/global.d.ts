import { LOG_LEVELS } from "./constants";

declare global {
  type LogLevel = keyof typeof LOG_LEVELS;

  interface GlobalThis {
    CIRCOM_DEFAULTS?: Record<string, unknown>;
    CONSTRAINT_RECORDS_PATH?: string;
    LOG_LEVEL?: LogLevel;
  }

  type Range<
    N extends number,
    Result extends Array<unknown> = [],
  > = Result["length"] extends N
    ? Result
    : Range<N, [...Result, Result["length"]]>;

  // Bit
  type Bit = Range<2>[number];
  type Bit2 = [Bit, Bit];
  type Bit4 = [Bit, Bit, Bit, Bit];

  // Base64
  type Base64 = Range<64>[number];

  // ASCII
  type Ascii = Range<128>[number];

  // Byte
  type Byte = Range<256>[number];
  type Byte4 = [Byte, Byte, Byte, Byte];
  type Byte12 = [
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
  ];
  type Byte16 = [
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
    Byte,
  ];

  // Synthetic
  type Utf8 = {
    bytes: Byte4;
    validBytes: Bit4;
  };

  type Word = { bytes: Byte4 };
  type Word4 = [Word, Word, Word, Word];
}