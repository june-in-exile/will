pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux2.circom";

// UTF-8 Encoding：
// 0x0000-0x007F    -> encode to 1 byte (0xxxxxxx)
// 0x0080-0x07FF    -> encode to 2 bytes (110xxxxx 10xxxxxx)  
// 0x0800-0xFFFF    -> encode to 3 bytes (1110xxxx 10xxxxxx 10xxxxxx)
// 0x10000-0x10FFFF -> encode to 4 bytes (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
template Utf8ByteLength() {
    signal input codepoint;
    signal output length[2];
    
    signal {bool} lt0x0080 <== LessThan(32)([codepoint,128]);
    signal {bool} lt0x0800 <== LessThan(32)([codepoint,2048]);
    signal {bool} lt0x10000 <== LessThan(32)([codepoint,65536]);
    signal {bool} lt0x110000 <== LessThan(32)([codepoint,1114112]);
    
    signal {bool} is1byte <== lt0x0080;
    signal {bool} is2byte <== (1 - lt0x0080) * lt0x0800;
    signal {bool} is3byte <== (1 - lt0x0800) * lt0x10000;
    signal {bool} is4byte <== (1 - lt0x10000) * lt0x110000;
    
    1 === is1byte + is2byte + is3byte + is4byte;
    
    // 1 byte: [0,0]
    // 2 byte: [0,1]
    // 3 byte: [1,0]
    // 4 byte: [1,1]
    length[0] <== is2byte + is4byte;  // LSB
    length[1] <== is3byte + is4byte;  // MSB
}

template Utf8Encoder() {
    signal input codepoint;
    signal output bytes[4];
    signal output validBytes[4];
    
    signal {bits21} codepointBits[21] <== Num2Bits(21)(codepoint);  // Unicode requires 21-bit at most
    
    // 1-byte encoding (0xxxxxxx)
    signal byte1_1byte <== Bits2Num(8)([
            codepointBits[0],
            codepointBits[1],
            codepointBits[2],
            codepointBits[3],
            codepointBits[4],
            codepointBits[5],
            codepointBits[6],
            0
        ]);
    
    // 2-byte encoding (110xxxxx 10xxxxxx)
    // 11000000 | (codepoint >> 6)
    signal byte1_2byte <== Bits2Num(8)([
            codepointBits[6],
            codepointBits[7],
            codepointBits[8],
            codepointBits[9],
            codepointBits[10],
            0,
            1,
            1
        ]);

    // 10000000 | (codepoint & 00111111)
    signal byte2_2byte <== Bits2Num(8)([
            codepointBits[0],
            codepointBits[1],
            codepointBits[2],
            codepointBits[3],
            codepointBits[4],
            codepointBits[5],
            0,
            1
        ]);
    
    // 3-byte encoding (1110xxxx 10xxxxxx 10xxxxxx)
    // 11100000 | (codepoint >> 12)
    signal byte1_3byte <== Bits2Num(8)([
            codepointBits[12],
            codepointBits[13],
            codepointBits[14],
            codepointBits[15],
            0,
            1,
            1,
            1
        ]);
    
    // 10000000 | ((codepoint >> 6) & 00111111)
    signal byte2_3byte <== Bits2Num(8)([
            codepointBits[6],
            codepointBits[7],
            codepointBits[8],
            codepointBits[9],
            codepointBits[10],
            codepointBits[11],
            0,
            1
        ]);

    // 10000000 | (codepoint & 00111111)
    signal byte3_3byte <== Bits2Num(8)([
            codepointBits[0],
            codepointBits[1],
            codepointBits[2],
            codepointBits[3],
            codepointBits[4],
            codepointBits[5],
            0,
            1
        ]);
    
    // 4-byte encoding (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
    // 11110000 | (codepoint >> 18)
    signal byte1_4byte <== Bits2Num(8)([
            codepointBits[18],
            codepointBits[19],
            codepointBits[20],
            0,
            1,
            1,
            1,
            1
        ]);

    // 10000000 | ((codepoint >> 12) & 00111111)
    signal byte2_4byte <== Bits2Num(8)([
            codepointBits[12],
            codepointBits[13],
            codepointBits[14],
            codepointBits[15],
            codepointBits[16],
            codepointBits[17],
            0,
            1
        ]);
    
    // 10000000 | ((codepoint >> 6) & 00111111)
    signal byte3_4byte <== Bits2Num(8)([
            codepointBits[6],
            codepointBits[7],
            codepointBits[8],
            codepointBits[9],
            codepointBits[10],
            codepointBits[11],
            0,
            1
        ]);

    // 10000000 | (codepoint & 00111111)
    signal byte4_4byte <== Bits2Num(8)([
            codepointBits[0],
            codepointBits[1],
            codepointBits[2],
            codepointBits[3],
            codepointBits[4],
            codepointBits[5],
            0,
            1
        ]);
    
    signal {bits2} length[2] <== Utf8ByteLength()(codepoint);

    bytes[0] <== Mux2()([byte1_1byte,byte1_2byte,byte1_3byte,byte1_4byte],length);
    bytes[1] <== Mux2()([0,byte2_2byte,byte2_3byte,byte2_4byte],length);
    bytes[2] <== Mux2()([0,0,byte3_3byte,byte3_4byte],length);
    bytes[3] <== Mux2()([0,0,0,byte4_4byte],length);
    
    component isLength1 = IsEqual();
    isLength1.in[0] <== length[0] + length[1] * 2;
    isLength1.in[1] <== 0;  // length = 1
    
    component isLength2 = IsEqual();
    isLength2.in[0] <== length[0] + length[1] * 2;
    isLength2.in[1] <== 1;  // length = 2
    
    component isLength3 = IsEqual();
    isLength3.in[0] <== length[0] + length[1] * 2;
    isLength3.in[1] <== 2;  // length = 3
    
    component isLength4 = IsEqual();
    isLength4.in[0] <== length[0] + length[1] * 2;
    isLength4.in[1] <== 3;  // length = 4
    
    validBytes[0] <== 1;
    validBytes[1] <== isLength2.out + isLength3.out + isLength4.out;
    validBytes[2] <== isLength3.out + isLength4.out;
    validBytes[3] <== isLength4.out;
}

// 字串編碼器 - 編碼多個字符
template Utf8StringEncoder(maxChars) {
    signal input codepoints[maxChars];
    signal input length;  // 實際字符數量
    signal output bytes[maxChars * 4];  // 最大輸出字節數
    signal output totalBytes;           // 實際字節數
    
    component encoders[maxChars];
    for (var i = 0; i < maxChars; i++) {
        encoders[i] = Utf8Encoder();
        encoders[i].codepoint <== codepoints[i];
    }
    
    // 計算總字節數並排列輸出
    signal byteCounts[maxChars];
    for (var i = 0; i < maxChars; i++) {
        byteCounts[i] <== encoders[i].validBytes[0] + 
                          encoders[i].validBytes[1] + 
                          encoders[i].validBytes[2] + 
                          encoders[i].validBytes[3];
    }
    
    // 簡化版本：假設按順序排列字節
    var byteIndex = 0;
    for (var i = 0; i < maxChars; i++) {
        for (var j = 0; j < 4; j++) {
            bytes[byteIndex] <== encoders[i].bytes[j] * encoders[i].validBytes[j];
            byteIndex++;
        }
    }
    
    // 計算總字節數（簡化版本）
    totalBytes <== byteCounts[0] + 
                   (length > 1 ? byteCounts[1] : 0) +
                   (length > 2 ? byteCounts[2] : 0) +
                   (length > 3 ? byteCounts[3] : 0);
}

/*
使用方法：

1. 編譯電路：
   circom utf8_encoder.circom --r1cs --wasm --sym

2. 輸入格式 (input.json)：
   {
     "codepoint": 65  // 例如：'A' 的 Unicode 碼點
   }

3. 測試案例：
   - 'A' (U+0041) -> [65, 0, 0, 0], validBytes: [1, 0, 0, 0]
   - 'ñ' (U+00F1) -> [195, 177, 0, 0], validBytes: [1, 1, 0, 0] 
   - '中' (U+4E2D) -> [228, 184, 173, 0], validBytes: [1, 1, 1, 0]
   - '🚀' (U+1F680) -> [240, 159, 154, 128], validBytes: [1, 1, 1, 1]

注意：
- 這個實現專注於 UTF-8 編碼的核心邏輯
- 在實際的區塊鏈應用中，你可能需要優化電路大小
- 可以根據需要調整最大字符數和字節數限制
*/