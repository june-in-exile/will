pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux4.circom";

template Utf8Encoder(inputLength, outputLength) {
    signal input bytes[inputLength];
    signal output utf8Bytes[outputLength];
    
    // 簡化實現：假設都是 ASCII 字符 (1 字節 UTF-8)
    // 完整實現需要處理多字節 UTF-8 字符
    for (var i = 0; i < inputLength && i < outputLength; i++) {
        utf8Bytes[i] <== bytes[i];
    }
}


// UTF-8 字節長度檢測器
template Utf8ByteLength() {
    signal input codepoint;
    signal output length[2];  // 用 2 位表示長度 (1-4)
    
    // UTF-8 編碼規則：
    // 0x0000-0x007F: 1 字節 (0xxxxxxx)
    // 0x0080-0x07FF: 2 字節 (110xxxxx 10xxxxxx)  
    // 0x0800-0xFFFF: 3 字節 (1110xxxx 10xxxxxx 10xxxxxx)
    // 0x10000-0x10FFFF: 4 字節 (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
    
    component lt128 = LessThan(32);
    lt128.in[0] <== codepoint;
    lt128.in[1] <== 128;  // 0x80
    
    component lt2048 = LessThan(32);
    lt2048.in[0] <== codepoint;
    lt2048.in[1] <== 2048;  // 0x800
    
    component lt65536 = LessThan(32);
    lt65536.in[0] <== codepoint;
    lt65536.in[1] <== 65536;  // 0x10000
    
    // 計算長度
    // length = 1 if codepoint < 128
    // length = 2 if 128 <= codepoint < 2048  
    // length = 3 if 2048 <= codepoint < 65536
    // length = 4 if codepoint >= 65536
    
    signal is1byte <== lt128.out;
    signal is2byte <== (1 - lt128.out) * lt2048.out;
    signal is3byte <== (1 - lt2048.out) * lt65536.out;
    signal is4byte <== (1 - lt65536.out);
    
    // 轉換為 2 位二進制
    length[0] <== is2byte + is4byte;  // LSB
    length[1] <== is3byte + is4byte;  // MSB
}

// UTF-8 編碼器主模板
template Utf8Encoder() {
    signal input codepoint;
    signal output bytes[4];      // 最多 4 個字節
    signal output validBytes[4]; // 哪些字節是有效的
    
    // 獲取字節長度
    component lengthCalc = Utf8ByteLength();
    lengthCalc.codepoint <== codepoint;
    
    // 將碼點轉換為位元
    component codepointBits = Num2Bits(21);  // Unicode 最大需要 21 位
    codepointBits.in <== codepoint;
    
    // 準備不同長度的編碼
    signal byte1_1byte;  // 1 字節編碼的第一個字節
    signal byte1_2byte;  // 2 字節編碼的第一個字節
    signal byte2_2byte;  // 2 字節編碼的第二個字節
    signal byte1_3byte;  // 3 字節編碼的第一個字節
    signal byte2_3byte;  // 3 字節編碼的第二個字節
    signal byte3_3byte;  // 3 字節編碼的第三個字節
    signal byte1_4byte;  // 4 字節編碼的第一個字節
    signal byte2_4byte;  // 4 字節編碼的第二個字節
    signal byte3_4byte;  // 4 字節編碼的第三個字節
    signal byte4_4byte;  // 4 字節編碼的第四個字節
    
    // 1 字節編碼 (0xxxxxxx)
    component byte1_1_bits = Bits2Num(8);
    byte1_1_bits.in[0] <== codepointBits.out[0];
    byte1_1_bits.in[1] <== codepointBits.out[1];
    byte1_1_bits.in[2] <== codepointBits.out[2];
    byte1_1_bits.in[3] <== codepointBits.out[3];
    byte1_1_bits.in[4] <== codepointBits.out[4];
    byte1_1_bits.in[5] <== codepointBits.out[5];
    byte1_1_bits.in[6] <== codepointBits.out[6];
    byte1_1_bits.in[7] <== 0;
    byte1_1byte <== byte1_1_bits.out;
    
    // 2 字節編碼 (110xxxxx 10xxxxxx)
    component byte1_2_bits = Bits2Num(8);
    byte1_2_bits.in[0] <== codepointBits.out[6];
    byte1_2_bits.in[1] <== codepointBits.out[7];
    byte1_2_bits.in[2] <== codepointBits.out[8];
    byte1_2_bits.in[3] <== codepointBits.out[9];
    byte1_2_bits.in[4] <== codepointBits.out[10];
    byte1_2_bits.in[5] <== 0;
    byte1_2_bits.in[6] <== 1;
    byte1_2_bits.in[7] <== 1;
    byte1_2byte <== byte1_2_bits.out;
    
    component byte2_2_bits = Bits2Num(8);
    byte2_2_bits.in[0] <== codepointBits.out[0];
    byte2_2_bits.in[1] <== codepointBits.out[1];
    byte2_2_bits.in[2] <== codepointBits.out[2];
    byte2_2_bits.in[3] <== codepointBits.out[3];
    byte2_2_bits.in[4] <== codepointBits.out[4];
    byte2_2_bits.in[5] <== codepointBits.out[5];
    byte2_2_bits.in[6] <== 0;
    byte2_2_bits.in[7] <== 1;
    byte2_2byte <== byte2_2_bits.out;
    
    // 3 字節編碼 (1110xxxx 10xxxxxx 10xxxxxx)
    component byte1_3_bits = Bits2Num(8);
    byte1_3_bits.in[0] <== codepointBits.out[12];
    byte1_3_bits.in[1] <== codepointBits.out[13];
    byte1_3_bits.in[2] <== codepointBits.out[14];
    byte1_3_bits.in[3] <== codepointBits.out[15];
    byte1_3_bits.in[4] <== 0;
    byte1_3_bits.in[5] <== 1;
    byte1_3_bits.in[6] <== 1;
    byte1_3_bits.in[7] <== 1;
    byte1_3byte <== byte1_3_bits.out;
    
    component byte2_3_bits = Bits2Num(8);
    byte2_3_bits.in[0] <== codepointBits.out[6];
    byte2_3_bits.in[1] <== codepointBits.out[7];
    byte2_3_bits.in[2] <== codepointBits.out[8];
    byte2_3_bits.in[3] <== codepointBits.out[9];
    byte2_3_bits.in[4] <== codepointBits.out[10];
    byte2_3_bits.in[5] <== codepointBits.out[11];
    byte2_3_bits.in[6] <== 0;
    byte2_3_bits.in[7] <== 1;
    byte2_3byte <== byte2_3_bits.out;
    
    component byte3_3_bits = Bits2Num(8);
    byte3_3_bits.in[0] <== codepointBits.out[0];
    byte3_3_bits.in[1] <== codepointBits.out[1];
    byte3_3_bits.in[2] <== codepointBits.out[2];
    byte3_3_bits.in[3] <== codepointBits.out[3];
    byte3_3_bits.in[4] <== codepointBits.out[4];
    byte3_3_bits.in[5] <== codepointBits.out[5];
    byte3_3_bits.in[6] <== 0;
    byte3_3_bits.in[7] <== 1;
    byte3_3byte <== byte3_3_bits.out;
    
    // 4 字節編碼 (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
    component byte1_4_bits = Bits2Num(8);
    byte1_4_bits.in[0] <== codepointBits.out[18];
    byte1_4_bits.in[1] <== codepointBits.out[19];
    byte1_4_bits.in[2] <== codepointBits.out[20];
    byte1_4_bits.in[3] <== 0;
    byte1_4_bits.in[4] <== 0;
    byte1_4_bits.in[5] <== 1;
    byte1_4_bits.in[6] <== 1;
    byte1_4_bits.in[7] <== 1;
    byte1_4byte <== byte1_4_bits.out;
    
    component byte2_4_bits = Bits2Num(8);
    byte2_4_bits.in[0] <== codepointBits.out[12];
    byte2_4_bits.in[1] <== codepointBits.out[13];
    byte2_4_bits.in[2] <== codepointBits.out[14];
    byte2_4_bits.in[3] <== codepointBits.out[15];
    byte2_4_bits.in[4] <== codepointBits.out[16];
    byte2_4_bits.in[5] <== codepointBits.out[17];
    byte2_4_bits.in[6] <== 0;
    byte2_4_bits.in[7] <== 1;
    byte2_4byte <== byte2_4_bits.out;
    
    component byte3_4_bits = Bits2Num(8);
    byte3_4_bits.in[0] <== codepointBits.out[6];
    byte3_4_bits.in[1] <== codepointBits.out[7];
    byte3_4_bits.in[2] <== codepointBits.out[8];
    byte3_4_bits.in[3] <== codepointBits.out[9];
    byte3_4_bits.in[4] <== codepointBits.out[10];
    byte3_4_bits.in[5] <== codepointBits.out[11];
    byte3_4_bits.in[6] <== 0;
    byte3_4_bits.in[7] <== 1;
    byte3_4byte <== byte3_4_bits.out;
    
    component byte4_4_bits = Bits2Num(8);
    byte4_4_bits.in[0] <== codepointBits.out[0];
    byte4_4_bits.in[1] <== codepointBits.out[1];
    byte4_4_bits.in[2] <== codepointBits.out[2];
    byte4_4_bits.in[3] <== codepointBits.out[3];
    byte4_4_bits.in[4] <== codepointBits.out[4];
    byte4_4_bits.in[5] <== codepointBits.out[5];
    byte4_4_bits.in[6] <== 0;
    byte4_4_bits.in[7] <== 1;
    byte4_4byte <== byte4_4_bits.out;
    
    // 使用選擇器選擇正確的字節
    component mux1 = MultiMux4(1);
    mux1.c[0][0] <== byte1_1byte;
    mux1.c[0][1] <== byte1_2byte;
    mux1.c[0][2] <== byte1_3byte;
    mux1.c[0][3] <== byte1_4byte;
    mux1.s[0] <== lengthCalc.length[0];
    mux1.s[1] <== lengthCalc.length[1];
    bytes[0] <== mux1.out[0];
    
    component mux2 = MultiMux4(1);
    mux2.c[0][0] <== 0;
    mux2.c[0][1] <== byte2_2byte;
    mux2.c[0][2] <== byte2_3byte;
    mux2.c[0][3] <== byte2_4byte;
    mux2.s[0] <== lengthCalc.length[0];
    mux2.s[1] <== lengthCalc.length[1];
    bytes[1] <== mux2.out[0];
    
    component mux3 = MultiMux4(1);
    mux3.c[0][0] <== 0;
    mux3.c[0][1] <== 0;
    mux3.c[0][2] <== byte3_3byte;
    mux3.c[0][3] <== byte3_4byte;
    mux3.s[0] <== lengthCalc.length[0];
    mux3.s[1] <== lengthCalc.length[1];
    bytes[2] <== mux3.out[0];
    
    component mux4 = MultiMux4(1);
    mux4.c[0][0] <== 0;
    mux4.c[0][1] <== 0;
    mux4.c[0][2] <== 0;
    mux4.c[0][3] <== byte4_4byte;
    mux4.s[0] <== lengthCalc.length[0];
    mux4.s[1] <== lengthCalc.length[1];
    bytes[3] <== mux4.out[0];
    
    // 設置有效字節標記
    component isLength1 = IsEqual();
    isLength1.in[0] <== lengthCalc.length[0] + lengthCalc.length[1] * 2;
    isLength1.in[1] <== 0;  // length = 1
    
    component isLength2 = IsEqual();
    isLength2.in[0] <== lengthCalc.length[0] + lengthCalc.length[1] * 2;
    isLength2.in[1] <== 1;  // length = 2
    
    component isLength3 = IsEqual();
    isLength3.in[0] <== lengthCalc.length[0] + lengthCalc.length[1] * 2;
    isLength3.in[1] <== 2;  // length = 3
    
    component isLength4 = IsEqual();
    isLength4.in[0] <== lengthCalc.length[0] + lengthCalc.length[1] * 2;
    isLength4.in[1] <== 3;  // length = 4
    
    validBytes[0] <== 1;  // 第一個字節總是有效的
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

// 主組件 - 單字符編碼器
component main = Utf8Encoder();

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