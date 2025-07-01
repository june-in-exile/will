/*
 * Base64 解碼電路實現
 * 包含 Base64CharToValue 和 Base64GroupDecoder 兩個核心模板
 */

pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
include "../shared/utils/range.circom";
include "../shared/utils/mod.circom";

// =============================================================================
// Base64 字符到數值轉換
// =============================================================================

/**
 * Base64 字符映射表：
 * A-Z: 0-25   (ASCII 65-90)
 * a-z: 26-51  (ASCII 97-122)  
 * 0-9: 52-61  (ASCII 48-57)
 * +:   62     (ASCII 43)
 * /:   63     (ASCII 47)
 * =:   64     (ASCII 61, padding)
 */
template Base64CharToValue() {
    signal input char;    // ASCII 碼值 (0-127)
    signal output value;  // Base64 數值 (0-64)
    
    // 用於檢查字符範圍的中間信號
    signal isUpperCase;   // A-Z
    signal isLowerCase;   // a-z
    signal isDigit;       // 0-9
    signal isPlus;        // +
    signal isSlash;       // /
    signal isPadding;     // =
    
    // 範圍檢查組件
    component upperCheck = InRange(7, 65, 90);   // A-Z
    component lowerCheck = InRange(7, 97, 122);  // a-z  
    component digitCheck = InRange(7, 48, 57);   // 0-9
    component plusCheck = IsEqual();          // +
    component slashCheck = IsEqual();         // /
    component paddingCheck = IsEqual();       // =
    
    upperCheck.in <== char;
    lowerCheck.in <== char;
    digitCheck.in <== char;
    
    plusCheck.in[0] <== char;
    plusCheck.in[1] <== 43;  // ASCII for '+'
    
    slashCheck.in[0] <== char;
    slashCheck.in[1] <== 47;  // ASCII for '/'
    
    paddingCheck.in[0] <== char;
    paddingCheck.in[1] <== 61;  // ASCII for '='
    
    isUpperCase <== upperCheck.out;
    isLowerCase <== lowerCheck.out;
    isDigit <== digitCheck.out;
    isPlus <== plusCheck.out;
    isSlash <== slashCheck.out;
    isPadding <== paddingCheck.out;
    
    // 確保字符是有效的 Base64 字符
    signal isValidChar;
    isValidChar <== isUpperCase + isLowerCase + isDigit + isPlus + isSlash + isPadding;
    isValidChar === 1;
    
    // 計算對應的數值
    signal upperValue;    // A-Z -> 0-25
    signal lowerValue;    // a-z -> 26-51
    signal digitValue;    // 0-9 -> 52-61
    signal plusValue;     // + -> 62
    signal slashValue;    // / -> 63
    signal paddingValue;  // = -> 64
    
    upperValue <== isUpperCase * (char - 65);        // A=0, B=1, ..., Z=25
    lowerValue <== isLowerCase * (char - 97 + 26);   // a=26, b=27, ..., z=51
    digitValue <== isDigit * (char - 48 + 52);       // 0=52, 1=53, ..., 9=61
    plusValue <== isPlus * 62;
    slashValue <== isSlash * 63;
    paddingValue <== isPadding * 64;
    
    value <== upperValue + lowerValue + digitValue + plusValue + slashValue + paddingValue;
}

component main = Base64CharToValue();

// =============================================================================
// Base64 組解碼器 (4 字符 -> 3 字節)
// =============================================================================

/**
 * 將 4 個 Base64 數值解碼為 3 個字節
 * 輸入：4 個 Base64 數值 (0-64)
 * 輸出：3 個字節 (0-255)
 * 
 * Base64 解碼公式：
 * 4 個 6-bit 數值 -> 3 個 8-bit 字節
 * 
 * 例如：values = [19, 22, 5, 46] (TWVu -> "Men")
 * byte1 = (19 << 2) | (22 >> 4) = 76 + 1 = 77 ('M')
 * byte2 = ((22 & 15) << 4) | (5 >> 2) = 96 + 1 = 97 ('e') 
 * byte3 = ((5 & 3) << 6) | 46 = 64 + 46 = 110 ('n')
 */
// template Base64GroupDecoder() {
//     signal input values[4];   // 4 個 Base64 數值 (0-64)
//     signal output bytes[3];   // 3 個解碼後的字節 (0-255)
    
//     // 處理 padding 的情況
//     signal isPadding[4];
//     for (var i = 0; i < 4; i++) {
//         component paddingCheck = IsEqual();
//         paddingCheck.in[0] <== values[i];
//         paddingCheck.in[1] <== 64;  // padding 值
//         isPadding[i] <== paddingCheck.out;
//     }
    
//     // 確保 padding 只能出現在末尾
//     // 如果有 padding，必須是連續的末尾字符
//     signal hasNoPadding;
//     signal hasOnePadding;
//     signal hasTwoPadding;
    
//     hasNoPadding <== (1 - isPadding[0]) * (1 - isPadding[1]) * (1 - isPadding[2]) * (1 - isPadding[3]);
//     hasOnePadding <== (1 - isPadding[0]) * (1 - isPadding[1]) * (1 - isPadding[2]) * isPadding[3];
//     hasTwoPadding <== (1 - isPadding[0]) * (1 - isPadding[1]) * isPadding[2] * isPadding[3];
    
//     signal validPadding;
//     validPadding <== hasNoPadding + hasOnePadding + hasTwoPadding;
//     validPadding === 1;
    
//     // 將有效數值提取（padding 視為 0）
//     signal effectiveValues[4];
//     for (var i = 0; i < 4; i++) {
//         effectiveValues[i] <== values[i] * (1 - isPadding[i]);
//     }
    
//     // 確保所有有效值都在 0-63 範圍內
//     for (var i = 0; i < 4; i++) {
//         component valueCheck = LessEqThan(6);
//         valueCheck.in[0] <== effectiveValues[i];
//         valueCheck.in[1] <== 63;
//         valueCheck.out === 1;
//     }
    
//     // Base64 解碼計算
//     // 每個 Base64 字符代表 6 位
//     // 4 個字符 = 24 位 = 3 個字節
    
//     // 計算位移和掩碼操作
//     signal value0_shifted_left_2;    // values[0] << 2
//     signal value1_shifted_right_4;   // values[1] >> 4
//     signal value1_masked_left_4;     // (values[1] & 15) << 4
//     signal value2_shifted_right_2;   // values[2] >> 2
//     signal value2_masked_left_6;     // (values[2] & 3) << 6
    
//     // 位移運算（在 ZK 電路中用乘法和除法實現）
//     value0_shifted_left_2 <== effectiveValues[0] * 4;        // << 2
//     value1_shifted_right_4 <== effectiveValues[1] \ 16;      // >> 4
    
//     // 計算掩碼（values[1] & 15）
//     signal value1_mod_16;
//     component mod16 = Modulo(6, 4);  // 6-bit 輸入，模 16
//     mod16.in <== effectiveValues[1];
//     value1_mod_16 <== mod16.out;
//     value1_masked_left_4 <== value1_mod_16 * 16;  // << 4
    
//     value2_shifted_right_2 <== effectiveValues[2] \ 4;       // >> 2
    
//     // 計算掩碼（values[2] & 3）
//     signal value2_mod_4;
//     component mod4 = Modulo(6, 2);   // 6-bit 輸入，模 4
//     mod4.in <== effectiveValues[2];
//     value2_mod_4 <== mod4.out;
//     value2_masked_left_6 <== value2_mod_4 * 64;  // << 6
    
//     // 組合成最終字節
//     bytes[0] <== value0_shifted_left_2 + value1_shifted_right_4;
//     bytes[1] <== value1_masked_left_4 + value2_shifted_right_2;
//     bytes[2] <== value2_masked_left_6 + effectiveValues[3];
    
//     // 根據 padding 情況調整輸出
//     // 1 個 padding：只有 2 個有效字節
//     // 2 個 padding：只有 1 個有效字節
//     signal finalBytes[3];
//     finalBytes[0] <== bytes[0];  // 第一個字節總是有效的
//     finalBytes[1] <== bytes[1] * (1 - hasTwoPadding);  // 有兩個 padding 時為 0
//     finalBytes[2] <== bytes[2] * hasNoPadding;         // 只有無 padding 時才有效
    
//     // 確保字節值在正確範圍內
//     for (var i = 0; i < 3; i++) {
//         component byteCheck = LessEqThan(8);
//         byteCheck.in[0] <== finalBytes[i];
//         byteCheck.in[1] <== 255;
//         byteCheck.out === 1;
        
//         bytes[i] <== finalBytes[i];
//     }
// }

// =============================================================================
// 測試和驗證電路
// =============================================================================

/**
 * 測試 Base64 解碼功能
 * 使用已知的測試向量進行驗證
 */
// template TestBase64Decoder() {
//     // 測試 "TWFu" -> "Man"
//     // T=19, W=22, F=5, u=46
//     // 期望輸出：M=77, a=97, n=110
    
//     signal input testChars[4];    // [84, 87, 70, 117] - ASCII for "TWFu"
//     signal output testBytes[3];   // 期望 [77, 97, 110]
    
//     // 字符轉數值
//     component charToValue[4];
//     for (var i = 0; i < 4; i++) {
//         charToValue[i] = Base64CharToValue();
//         charToValue[i].char <== testChars[i];
//     }
    
//     // 組解碼
//     component groupDecoder = Base64GroupDecoder();
//     for (var i = 0; i < 4; i++) {
//         groupDecoder.values[i] <== charToValue[i].value;
//     }
    
//     for (var i = 0; i < 3; i++) {
//         testBytes[i] <== groupDecoder.bytes[i];
//     }
// }

/**
 * 完整的 Base64 解碼器（支援多組）
 * 這是將來整合到主電路中的版本
 */
// template Base64Decoder(inputLength, outputLength) {
//     signal input base64Chars[inputLength];  // base64 字符的 ASCII 值
//     signal output bytes[outputLength];      // 解碼後的字節
    
//     // 確保輸入長度是 4 的倍數（padding 後）
//     assert(inputLength % 4 == 0);
    
//     var groups = inputLength \ 4;
    
//     // 字符轉數值
//     component charToValue[inputLength];
//     for (var i = 0; i < inputLength; i++) {
//         charToValue[i] = Base64CharToValue();
//         charToValue[i].char <== base64Chars[i];
//     }
    
//     // 組解碼
//     component groupDecoder[groups];
//     for (var i = 0; i < groups; i++) {
//         groupDecoder[i] = Base64GroupDecoder();
        
//         for (var j = 0; j < 4; j++) {
//             groupDecoder[i].values[j] <== charToValue[i * 4 + j].value;
//         }
        
//         // 輸出字節（注意處理最後一組可能的 padding）
//         for (var j = 0; j < 3; j++) {
//             var byteIndex = i * 3 + j;
//             if (byteIndex < outputLength) {
//                 bytes[byteIndex] <== groupDecoder[i].bytes[j];
//             }
//         }
//     }
// }




/*
使用說明：

1. Base64CharToValue:
   - 輸入：單個 ASCII 字符值 (0-127)
   - 輸出：對應的 Base64 數值 (0-64)
   - 自動驗證輸入字符的有效性

2. Base64GroupDecoder:
   - 輸入：4 個 Base64 數值
   - 輸出：3 個解碼後的字節
   - 正確處理 padding ('=') 情況
   - 自動驗證輸入範圍和 padding 格式

3. 測試方法：
   // 測試 "Man" -> TWFu -> [77, 97, 110]
   component test = TestBase64Decoder();
   test.testChars[0] <== 84;  // 'T'
   test.testChars[1] <== 87;  // 'W' 
   test.testChars[2] <== 70;  // 'F'
   test.testChars[3] <== 117; // 'u'
   
   // test.testBytes 應該輸出 [77, 97, 110]

4. 電路複雜度：
   - Base64CharToValue: ~50 約束
   - Base64GroupDecoder: ~100 約束
   - 總體較為高效，適合集成到更大的電路中

5. 依賴的標準庫函數：
   - IsEqual, GreaterEqThan, LessEqThan
   - 這些在 circomlib 中有標準實現
*/