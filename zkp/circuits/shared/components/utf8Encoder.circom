pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";
include "circomlib/circuits/mux2.circom";

/**
 * UTF-8 Encoding Ranges:
 * - 1 byte:  U+0000   to U+007F    (0 to 127)              - ASCII characters
 * - 2 bytes: U+0080   to U+07FF    (128 to 2,047)          - Latin extended, Greek, Cyrillic, etc.
 * - 3 bytes: U+0800   to U+FFFF    (2,048 to 65,535)       - Most other scripts (CJK, etc.)
 * - 4 bytes: U+10000  to U+10FFFF  (65,536 to 1,114,111)   - Supplementary planes (emoji, etc.)
 * 
 * @param codepoint - Unicode codepoint (0 to 1,114,111)
 * @returns length[2] - 2-bit binary representation of byte length
 * 
 * Output Encoding:
 * - [0,0]: 1 byte  (length = 0*2 + 0 = 0, interpreted as 1)
 * - [1,0]: 2 bytes (length = 0*2 + 1 = 1, interpreted as 2)  
 * - [0,1]: 3 bytes (length = 1*2 + 0 = 2, interpreted as 3)
 * - [1,1]: 4 bytes (length = 1*2 + 1 = 3, interpreted as 4)
 * 
 * Examples:
 * - 'A' (65):      length = [0,0] (1 byte)
 * - 'ñ' (241):     length = [1,0] (2 bytes)
 * - '中' (20013):   length = [0,1] (3 bytes)
 * - '🚀' (128640):  length = [1,1] (4 bytes)
 */
template Utf8ByteLength() {
    signal input {number} codepoint;
    signal output {bit} length[2];
    
    signal lt0x0080 <== LessThan(32)([codepoint,128]);
    signal lt0x0800 <== LessThan(32)([codepoint,2048]);
    signal lt0x10000 <== LessThan(32)([codepoint,65536]);
    signal lt0x110000 <== LessThan(32)([codepoint,1114112]);
    
    signal is1byte <== lt0x0080;
    signal is2byte <== (1 - lt0x0080) * lt0x0800;
    signal is3byte <== (1 - lt0x0800) * lt0x10000;
    signal is4byte <== (1 - lt0x10000) * lt0x110000;
    
    1 === is1byte + is2byte + is3byte + is4byte;
    
    length[0] <== is2byte + is4byte;
    length[1] <== is3byte + is4byte;
}

/**
 * Encoding Rules:
 * - 1 byte  (0-127):        0xxxxxxx
 * - 2 bytes (128-2047):     110xxxxx 10xxxxxx
 * - 3 bytes (2048-65535):   1110xxxx 10xxxxxx 10xxxxxx
 * - 4 bytes (65536+):       11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
 * 
 * @param codepoint - Unicode codepoint (0 to 1,114,111)
 * @returns bytes[4] - UTF-8 encoded bytes (unused bytes are set to 0)
 * @returns validBytes[4] - Binary flags indicating which bytes are valid
 * 
 * Examples:
 * - 'A' (U+0041 = 65):    bytes=[65,0,0,0],    validBytes=[1,0,0,0]
 * - 'ñ' (U+00F1 = 241):   bytes=[195,177,0,0], validBytes=[1,1,0,0]
 * - '中' (U+4E2D = 20013): bytes=[228,184,173,0], validBytes=[1,1,1,0]
 * - '🚀' (U+1F680 = 128640): bytes=[240,159,154,128], validBytes=[1,1,1,1]
 */
template Utf8Encoder() {
    signal input {number} codepoint;
    // TODO: handle with bus
    signal output {byte} bytes[4];
    signal output {bit} validBytes[4];
    
    signal codepointBits[21] <== Num2Bits(21)(codepoint);  // Unicode requires 21-bit at most
    
    // 1-byte encoding (0xxxxxxx)
    signal byte1_1byte <== Bits2Num(8)([codepointBits[0],codepointBits[1],codepointBits[2],codepointBits[3],codepointBits[4],codepointBits[5],codepointBits[6],0]);
    
    // 2-byte encoding (110xxxxx 10xxxxxx)
    // 11000000 | (codepoint >> 6)
    signal byte1_2byte <== Bits2Num(8)([codepointBits[6],codepointBits[7],codepointBits[8],codepointBits[9],codepointBits[10],0,1,1]);
    // 10000000 | (codepoint & 00111111)
    signal byte2_2byte <== Bits2Num(8)([codepointBits[0],codepointBits[1],codepointBits[2],codepointBits[3],codepointBits[4],codepointBits[5],0,1]);
    
    // 3-byte encoding (1110xxxx 10xxxxxx 10xxxxxx)
    // 11100000 | (codepoint >> 12)
    signal byte1_3byte <== Bits2Num(8)([codepointBits[12],codepointBits[13],codepointBits[14],codepointBits[15],0,1,1,1]);
    // 10000000 | ((codepoint >> 6) & 00111111)
    signal byte2_3byte <== Bits2Num(8)([codepointBits[6],codepointBits[7],codepointBits[8],codepointBits[9],codepointBits[10],codepointBits[11],0,1]);
    // 10000000 | (codepoint & 00111111)
    signal byte3_3byte <== Bits2Num(8)([codepointBits[0],codepointBits[1],codepointBits[2],codepointBits[3],codepointBits[4],codepointBits[5],0,1]);
    
    // 4-byte encoding (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
    // 11110000 | (codepoint >> 18)
    signal byte1_4byte <== Bits2Num(8)([codepointBits[18],codepointBits[19],codepointBits[20],0,1,1,1,1]);
    // 10000000 | ((codepoint >> 12) & 00111111)
    signal byte2_4byte <== Bits2Num(8)([codepointBits[12],codepointBits[13],codepointBits[14],codepointBits[15],codepointBits[16],codepointBits[17],0,1]);
    // 10000000 | ((codepoint >> 6) & 00111111)
    signal byte3_4byte <== Bits2Num(8)([codepointBits[6],codepointBits[7],codepointBits[8],codepointBits[9],codepointBits[10],codepointBits[11],0,1]);
    // 10000000 | (codepoint & 00111111)
    signal byte4_4byte <== Bits2Num(8)([codepointBits[0],codepointBits[1],codepointBits[2],codepointBits[3],codepointBits[4],codepointBits[5],0,1]);
    
    signal {bit} length[2] <== Utf8ByteLength()(codepoint);

    bytes[0] <== Mux2()([byte1_1byte,byte1_2byte,byte1_3byte,byte1_4byte],length);
    bytes[1] <== Mux2()([0,byte2_2byte,byte2_3byte,byte2_4byte],length);
    bytes[2] <== Mux2()([0,0,byte3_3byte,byte3_4byte],length);
    bytes[3] <== Mux2()([0,0,0,byte4_4byte],length);
    
    // component isLength2 = IsEqual();
    // isLength2.in[0] <== length[0] + length[1] * 2;
    // isLength2.in[1] <== 1;  // length = 2
    
    // component isLength3 = IsEqual();
    // isLength3.in[0] <== length[0] + length[1] * 2;
    // isLength3.in[1] <== 2;  // length = 3
    
    // component isLength4 = IsEqual();
    // isLength4.in[0] <== length[0] + length[1] * 2;
    // isLength4.in[1] <== 3;  // length = 4
    
    // validBytes[0] <== 1;
    // validBytes[1] <== isLength2.out + isLength3.out + isLength4.out;
    // validBytes[2] <== isLength3.out + isLength4.out;
    // validBytes[3] <== isLength4.out;
    
    validBytes[0] <== 1;
    validBytes[1] <== OR()(length[0],length[1]);
    validBytes[2] <== IsEqual()([length[1],1]);
    validBytes[3] <== AND()(length[0],length[1]);
}