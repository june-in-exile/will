export function utf8ByteLength(codepoint: number): { length: [number, number] } {
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

export function encodeUTF8(codepoint: number): { bytes: [number, number, number, number], validBytes: [number, number, number, number] } {
    if (codepoint < 0 || codepoint > 0x10FFFF) {
        throw new Error("Invalid Unicode codepoint");
    }

    if (codepoint <= 0x7F) {
        // 1 byte
        return {
            bytes: [codepoint, 0, 0, 0],
            validBytes: [1, 0, 0, 0],
        };
    } else if (codepoint <= 0x7FF) {
        // 2 bytes
        const byte1 = 0xC0 | (codepoint >> 6);
        const byte2 = 0x80 | (codepoint & 0x3F);
        return {
            bytes: [byte1, byte2, 0, 0],
            validBytes: [1, 1, 0, 0],
        };
    } else if (codepoint <= 0xFFFF) {
        // 3 bytes
        const byte1 = 0xE0 | (codepoint >> 12);
        const byte2 = 0x80 | ((codepoint >> 6) & 0x3F);
        const byte3 = 0x80 | (codepoint & 0x3F);
        return {
            bytes: [byte1, byte2, byte3, 0],
            validBytes: [1, 1, 1, 0],
        };
    } else {
        // 4 bytes
        const byte1 = 0xF0 | (codepoint >> 18);
        const byte2 = 0x80 | ((codepoint >> 12) & 0x3F);
        const byte3 = 0x80 | ((codepoint >> 6) & 0x3F);
        const byte4 = 0x80 | (codepoint & 0x3F);
        return {
            bytes: [byte1, byte2, byte3, byte4],
            validBytes: [1, 1, 1, 1],
        };
    }
}