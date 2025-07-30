/*
 * AES-256-GCM 零知識證明電路設計
 * 目標：在不洩漏私鑰的情況下證明能解密某密文
 * 
 * Public Inputs:  ciphertext (base64), iv (base64), authTag (base64)
 * Private Inputs: key (base64), plaintext (utf8)
 * 
 * 電路架構分層設計
 */

pragma circom 2.2.2;

include "../shared/components/base64.circom";

// =============================================================================
// 第一層：編碼轉換 Templates
// =============================================================================

/**
 * Base64 解碼器
 * 將 base64 字串轉換為字節陣列
 */
// template Base64Decoder(inputLength, outputLength) {
// }

/**
 * UTF-8 編碼器
 * 將字節陣列編碼為 UTF-8 字串的字節表示
 */
// template UTF8Encoder(inputLength, outputLength) {
//     signal input bytes[inputLength];
//     signal output utf8Bytes[outputLength];
    
//     // 簡化實現：假設都是 ASCII 字符 (1 字節 UTF-8)
//     // 完整實現需要處理多字節 UTF-8 字符
//     for (var i = 0; i < inputLength && i < outputLength; i++) {
//         utf8Bytes[i] <== bytes[i];
//     }
// }

// =============================================================================
// 第二層：密碼學基礎 Templates
// =============================================================================

/**
 * AES S-Box 查找
 */
template AESSubByte() {
    signal input byte;
    signal output substituted;
    
    // 使用 AES S-Box 表進行替換
    component sbox = AESSBox();
    sbox.input <== byte;
    substituted <== sbox.output;
}

/**
 * 伽羅瓦域 GF(2^8) 乘法
 */
template GF256Multiply() {
    signal input a, b;
    signal output product;
    
    // 實現 GF(2^8) 乘法運算
    component gfMul = GaloisFieldMultiplier();
    gfMul.a <== a;
    gfMul.b <== b;
    product <== gfMul.result;
}

/**
 * 伽羅瓦域 GF(2^128) 乘法 (用於 GHASH)
 */
template GF128Multiply() {
    signal input x[16];  // 128 位 = 16 字節
    signal input y[16];
    signal output product[16];
    
    // 實現 GF(2^128) 乘法，約化多項式為 x^128 + x^7 + x^2 + x + 1
    component gf128Mul = GaloisField128Multiplier();
    for (var i = 0; i < 16; i++) {
        gf128Mul.x[i] <== x[i];
        gf128Mul.y[i] <== y[i];
        product[i] <== gf128Mul.result[i];
    }
}

// =============================================================================
// 第三層：AES 核心運算 Templates
// =============================================================================

/**
 * AES-256 單輪加密
 */
template AESRound(isLastRound) {
    signal input state[16];
    signal input roundKey[16];
    signal output newState[16];
    
    // SubBytes
    component subBytes[16];
    for (var i = 0; i < 16; i++) {
        subBytes[i] = AESSubByte();
        subBytes[i].byte <== state[i];
    }
    
    // ShiftRows
    component shiftRows = AESShiftRows();
    for (var i = 0; i < 16; i++) {
        shiftRows.input[i] <== subBytes[i].substituted;
    }
    
    // MixColumns (除了最後一輪)
    signal mixColumnsOut[16];
    if (isLastRound == 0) {
        component mixColumns = AESMixColumns();
        for (var i = 0; i < 16; i++) {
            mixColumns.input[i] <== shiftRows.output[i];
            mixColumnsOut[i] <== mixColumns.output[i];
        }
    } else {
        for (var i = 0; i < 16; i++) {
            mixColumnsOut[i] <== shiftRows.output[i];
        }
    }
    
    // AddRoundKey
    for (var i = 0; i < 16; i++) {
        newState[i] <== mixColumnsOut[i] + roundKey[i] - 2 * mixColumnsOut[i] * roundKey[i];  // XOR
    }
}

/**
 * AES-256 完整加密
 */
template AES256Encrypt() {
    signal input plaintext[16];
    signal input key[32];
    signal output ciphertext[16];
    
    // 密鑰擴展
    component keyExpansion = AES256KeyExpansion();
    for (var i = 0; i < 32; i++) {
        keyExpansion.key[i] <== key[i];
    }
    
    // 初始 AddRoundKey
    signal state[15][16];  // 14 輪的中間狀態
    for (var i = 0; i < 16; i++) {
        state[0][i] <== plaintext[i] + keyExpansion.roundKeys[0][i] - 
                       2 * plaintext[i] * keyExpansion.roundKeys[0][i];  // XOR
    }
    
    // 14 輪加密
    component rounds[14];
    for (var round = 0; round < 14; round++) {
        rounds[round] = AESRound(round == 13 ? 1 : 0);  // 最後一輪特殊處理
        
        for (var i = 0; i < 16; i++) {
            rounds[round].state[i] <== state[round][i];
            rounds[round].roundKey[i] <== keyExpansion.roundKeys[round + 1][i];
        }
        
        if (round < 13) {
            for (var i = 0; i < 16; i++) {
                state[round + 1][i] <== rounds[round].newState[i];
            }
        }
    }
    
    // 輸出最終密文
    for (var i = 0; i < 16; i++) {
        ciphertext[i] <== rounds[13].newState[i];
    }
}

// =============================================================================
// 第四層：GCM 模式 Templates
// =============================================================================

/**
 * GHASH 計算
 */
template GHASH(dataLength) {
    signal input data[dataLength];
    signal input hashKey[16];
    signal output hash[16];
    
    // 初始化結果為 0
    signal result[dataLength \ 16 + 1][16];
    for (var i = 0; i < 16; i++) {
        result[0][i] <== 0;
    }
    
    // 逐塊處理
    var blocks = dataLength \ 16;
    component gfMul[blocks];
    
    for (var block = 0; block < blocks; block++) {
        // XOR 當前塊
        signal xorResult[16];
        for (var i = 0; i < 16; i++) {
            var dataIndex = block * 16 + i;
            if (dataIndex < dataLength) {
                xorResult[i] <== result[block][i] + data[dataIndex] - 
                                2 * result[block][i] * data[dataIndex];  // XOR
            } else {
                xorResult[i] <== result[block][i];
            }
        }
        
        // GF(2^128) 乘法
        gfMul[block] = GF128Multiply();
        for (var i = 0; i < 16; i++) {
            gfMul[block].x[i] <== xorResult[i];
            gfMul[block].y[i] <== hashKey[i];
            result[block + 1][i] <== gfMul[block].product[i];
        }
    }
    
    // 輸出最終哈希值
    for (var i = 0; i < 16; i++) {
        hash[i] <== result[blocks][i];
    }
}

/**
 * CTR 模式計數器遞增
 */
template CTRIncrement() {
    signal input counter[16];
    signal output incremented[16];
    
    // 只遞增最後 4 個字節（32位計數器）
    component increment = CounterIncrement32();
    for (var i = 0; i < 4; i++) {
        increment.input[i] <== counter[12 + i];
    }
    
    for (var i = 0; i < 12; i++) {
        incremented[i] <== counter[i];
    }
    for (var i = 0; i < 4; i++) {
        incremented[12 + i] <== increment.output[i];
    }
}

/**
 * CTR 模式解密
 */
template CTRDecrypt(ciphertextLength) {
    signal input ciphertext[ciphertextLength];
    signal input key[32];
    signal input j0[16];
    signal output plaintext[ciphertextLength];
    
    var numBlocks = (ciphertextLength + 15) \ 16;  // 向上取整
    
    component counterIncrement[numBlocks];
    component aesEncrypt[numBlocks];
    
    signal counter[numBlocks + 1][16];
    
    // 初始計數器
    for (var i = 0; i < 16; i++) {
        counter[0][i] <== j0[i];
    }
    
    // 對每個塊進行處理
    for (var block = 0; block < numBlocks; block++) {
        // 遞增計數器
        counterIncrement[block] = CTRIncrement();
        for (var i = 0; i < 16; i++) {
            counterIncrement[block].counter[i] <== counter[block][i];
            counter[block + 1][i] <== counterIncrement[block].incremented[i];
        }
        
        // AES 加密計數器
        aesEncrypt[block] = AES256Encrypt();
        for (var i = 0; i < 16; i++) {
            aesEncrypt[block].plaintext[i] <== counter[block + 1][i];
        }
        for (var i = 0; i < 32; i++) {
            aesEncrypt[block].key[i] <== key[i];
        }
        
        // XOR 得到明文
        for (var i = 0; i < 16; i++) {
            var cipherIndex = block * 16 + i;
            if (cipherIndex < ciphertextLength) {
                plaintext[cipherIndex] <== ciphertext[cipherIndex] + 
                    aesEncrypt[block].ciphertext[i] - 
                    2 * ciphertext[cipherIndex] * aesEncrypt[block].ciphertext[i];  // XOR
            }
        }
    }
}

// =============================================================================
// 第五層：頂層電路
// =============================================================================

/**
 * AES-256-GCM 解密驗證電路
 */
template AES256GCMDecryptProof(
    ciphertextBase64Length,
    ivBase64Length, 
    authTagBase64Length,
    keyBase64Length,
    plaintextUtf8Length
) {
    // Public inputs (base64 編碼)
    signal input ciphertextBase64[ciphertextBase64Length];
    signal input ivBase64[ivBase64Length];
    signal input authTagBase64[authTagBase64Length];
    
    // Private inputs
    signal input keyBase64[keyBase64Length];         // base64 編碼的私鑰
    signal input plaintextUtf8[plaintextUtf8Length]; // utf8 編碼的明文
    
    // 計算解碼後的長度
    var ciphertextLength = (ciphertextBase64Length * 3) \ 4;
    var ivLength = (ivBase64Length * 3) \ 4;
    var keyLength = (keyBase64Length * 3) \ 4;  // 應該是 32
    
    // 1. Base64 解碼
    component ciphertextDecoder = Base64Decoder(ciphertextBase64Length, ciphertextLength);
    component ivDecoder = Base64Decoder(ivBase64Length, ivLength);
    component authTagDecoder = Base64Decoder(authTagBase64Length, 16);
    component keyDecoder = Base64Decoder(keyBase64Length, keyLength);
    
    for (var i = 0; i < ciphertextBase64Length; i++) {
        ciphertextDecoder.base64Chars[i] <== ciphertextBase64[i];
    }
    for (var i = 0; i < ivBase64Length; i++) {
        ivDecoder.base64Chars[i] <== ivBase64[i];
    }
    for (var i = 0; i < authTagBase64Length; i++) {
        authTagDecoder.base64Chars[i] <== authTagBase64[i];
    }
    for (var i = 0; i < keyBase64Length; i++) {
        keyDecoder.base64Chars[i] <== keyBase64[i];
    }
    
    // 2. 計算 J0
    component j0Calculator = ComputeJ0(ivLength);
    for (var i = 0; i < ivLength; i++) {
        j0Calculator.iv[i] <== ivDecoder.bytes[i];
    }
    // 需要先計算 hash key (H = AES_K(0^128))
    component hashKeyGen = AES256Encrypt();
    for (var i = 0; i < 16; i++) {
        hashKeyGen.plaintext[i] <== 0;
    }
    for (var i = 0; i < 32; i++) {
        hashKeyGen.key[i] <== keyDecoder.bytes[i];
    }
    for (var i = 0; i < 16; i++) {
        j0Calculator.hashKey[i] <== hashKeyGen.ciphertext[i];
    }
    
    // 3. CTR 模式解密
    component ctrDecrypt = CTRDecrypt(ciphertextLength);
    for (var i = 0; i < ciphertextLength; i++) {
        ctrDecrypt.ciphertext[i] <== ciphertextDecoder.bytes[i];
    }
    for (var i = 0; i < 32; i++) {
        ctrDecrypt.key[i] <== keyDecoder.bytes[i];
    }
    for (var i = 0; i < 16; i++) {
        ctrDecrypt.j0[i] <== j0Calculator.j0[i];
    }
    
    // 4. 驗證解密結果與 private input 一致
    component utf8Encoder = UTF8Encoder(ciphertextLength, plaintextUtf8Length);
    for (var i = 0; i < ciphertextLength; i++) {
        utf8Encoder.bytes[i] <== ctrDecrypt.plaintext[i];
    }
    
    // 確認解密出的明文與提供的明文一致
    for (var i = 0; i < plaintextUtf8Length; i++) {
        plaintextUtf8[i] === utf8Encoder.utf8Bytes[i];
    }
    
    // 5. 驗證認證標籤
    component authVerify = GCMAuthVerify(ciphertextLength);
    for (var i = 0; i < ciphertextLength; i++) {
        authVerify.ciphertext[i] <== ciphertextDecoder.bytes[i];
    }
    for (var i = 0; i < 16; i++) {
        authVerify.hashKey[i] <== hashKeyGen.ciphertext[i];
        authVerify.j0[i] <== j0Calculator.j0[i];
        authVerify.expectedAuthTag[i] <== authTagDecoder.bytes[i];
    }
    
    // 如果到這裡沒有約束失敗，證明確實能用私鑰解密密文
}

// =============================================================================
// 電路分解建議
// =============================================================================

/*
建議的實現順序：

1. 【基礎工具】先實現簡單的輔助電路
   - [v] AsciiToBase64: 單個 base64 字符轉數值
   - [v] Base64GroupDecoder: 4個字符解碼為3字節
   
2. 【密碼學基礎】實現密碼學原語
   - AESSBox: S-Box 查找表
   - GaloisFieldMultiplier: GF(2^8) 乘法
   - GaloisField128Multiplier: GF(2^128) 乘法
   
3. 【AES 核心】分步實現 AES
   - AESShiftRows: 行位移
   - AESMixColumns: 列混淆  
   - AES256KeyExpansion: 密鑰擴展
   - 測試單個 AES 塊加密
   
4. 【GCM 組件】實現 GCM 特定功能
   - ComputeJ0: 計算初始計數器
   - GCMAuthVerify: 認證標籤驗證
   - CounterIncrement32: 32位計數器遞增
   
5. 【整合測試】組合完整電路
   - 先用小的測試向量驗證
   - 逐步增加複雜度

電路複雜度估計：
- 約束數量：~100,000-500,000 個約束
- 關鍵路徑：AES 輪函數和 GF(2^128) 乘法
- 建議使用 Circom 2.0 的優化功能

性能優化建議：
- 使用查找表減少約束
- 預計算常量
- 並行化可能的運算
- 考慮使用更高效的 hash 函數替代部分運算
*/