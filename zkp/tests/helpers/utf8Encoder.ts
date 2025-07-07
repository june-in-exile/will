function utf8ByteLength(codepoint: number): { length: [number, number] } {
  let length: [number, number];
  if (codepoint < 0x0080) {
    length = [0, 0];
  } else if (codepoint < 0x0800) {
    length = [1, 0];
  } else if (codepoint < 0x10000) {
    length = [0, 1];
  } else if (codepoint < 0x110000) {
    length = [1, 1];
  } else {
    throw new Error("Invalid UTF8 Char");
  }
  return { length };
}

function encodeUTF8(codepoint: number): {
  "utf8.bytes": [number, number, number, number];
  "utf8.validBytes": [number, number, number, number];
} {
  if (codepoint < 0 || codepoint > 0x10ffff) {
    throw new Error("Invalid Unicode codepoint");
  }

  if (codepoint <= 0x7f) {
    // 1 byte
    return {
      "utf8.bytes": [codepoint, 0, 0, 0],
      "utf8.validBytes": [1, 0, 0, 0],
    };
  } else if (codepoint <= 0x7ff) {
    // 2 bytes
    const byte1 = 0xc0 | (codepoint >> 6);
    const byte2 = 0x80 | (codepoint & 0x3f);
    return {
      "utf8.bytes": [byte1, byte2, 0, 0],
      "utf8.validBytes": [1, 1, 0, 0],
    };
  } else if (codepoint <= 0xffff) {
    // 3 bytes
    const byte1 = 0xe0 | (codepoint >> 12);
    const byte2 = 0x80 | ((codepoint >> 6) & 0x3f);
    const byte3 = 0x80 | (codepoint & 0x3f);
    return {
      "utf8.bytes": [byte1, byte2, byte3, 0],
      "utf8.validBytes": [1, 1, 1, 0],
    };
  } else {
    // 4 bytes
    const byte1 = 0xf0 | (codepoint >> 18);
    const byte2 = 0x80 | ((codepoint >> 12) & 0x3f);
    const byte3 = 0x80 | ((codepoint >> 6) & 0x3f);
    const byte4 = 0x80 | (codepoint & 0x3f);
    return {
      "utf8.bytes": [byte1, byte2, byte3, byte4],
      "utf8.validBytes": [1, 1, 1, 1],
    };
  }
}

function encodeUTF8String(codepoints: number[]): {
  bytes: number[];
  validByteCount: number;
} {
  const bytes: number[] = [];
  let validByteCount = 0;

  for (const codepoint of codepoints) {
    const encoded = encodeUTF8(codepoint);
    for (let i = 0; i < 4; i++) {
      if (encoded["utf8.validBytes"][i] === 1) {
        bytes.push(encoded["utf8.bytes"][i]);
        validByteCount++;
      }
    }
  }

  // Pad to expected length (codepoints.length * 4)
  while (bytes.length < codepoints.length * 4) {
    bytes.push(0);
  }

  return { bytes, validByteCount };
}

export { utf8ByteLength, encodeUTF8, encodeUTF8String };
