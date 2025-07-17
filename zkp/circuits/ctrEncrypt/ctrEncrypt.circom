pragma circom 2.0.0;

include "./aes.circom";

// CTR 加密主模板
template CTREncrypt(keyBits, maxBlocks) {
    var (Nk, Nb, Nr);
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        (Nk, Nb, Nr) = (4,4,10);
    } else if (keyBits == 192) {
        (Nk, Nb, Nr) = (6,4,12);
    } else {
        (Nk, Nb, Nr) = (8,4,14);
    }
    
    // 輸入信號
    signal input plaintext[maxBlocks * 16]; // 明文，以位元組為單位
    signal input key[Nk * 4]; // AES 金鑰，以位元組為單位
    signal input j0[16]; // 初始計數器值
    signal input numBlocks; // 實際要處理的區塊數量
    
    // 輸出信號
    signal output ciphertext[maxBlocks * 16]; // 密文
    
    // 確保 numBlocks 在有效範圍內
    component numBlocksCheck = LessEqualThan(8);
    numBlocksCheck.in[0] <== numBlocks;
    numBlocksCheck.in[1] <== maxBlocks;
    numBlocksCheck.out === 1;
    
    // 計數器陣列
    signal counters[maxBlocks + 1][16];
    counters[0] <== j0;
    
    // 為每個區塊生成計數器
    component counterIncrements[maxBlocks];
    for (var i = 0; i < maxBlocks; i++) {
        counterIncrements[i] = IncrementCounter();
        counterIncrements[i].counter_in <== counters[i];
        counters[i + 1] <== counterIncrements[i].counter_out;
    }
    
    // AES 加密元件陣列
    component aesBlocks[maxBlocks];
    signal keystreams[maxBlocks][16];
    
    // 轉換金鑰格式為 Word 陣列（如果需要）
    component keyConverter = BytesToWords(Nk);
    for (var i = 0; i < Nk * 4; i++) {
        keyConverter.bytes[i] <== key[i];
    }
    
    for (var i = 0; i < maxBlocks; i++) {
        aesBlocks[i] = EncryptBlock(keyBits);
        
        // 設定 AES 輸入
        for (var j = 0; j < 16; j++) {
            aesBlocks[i].plaintext[j] <== counters[i + 1][j];
        }
        for (var j = 0; j < Nk; j++) {
            aesBlocks[i].key[j] <== keyConverter.words[j];
        }
        
        // 獲取密鑰流
        for (var j = 0; j < 16; j++) {
            keystreams[i][j] <== aesBlocks[i].ciphertext[j];
        }
    }
    
    // XOR 運算產生密文
    component xorGates[maxBlocks][16];
    component blockSelectors[maxBlocks];
    
    for (var i = 0; i < maxBlocks; i++) {
        // 判斷此區塊是否應該被處理
        blockSelectors[i] = LessThan(8);
        blockSelectors[i].in[0] <== i;
        blockSelectors[i].in[1] <== numBlocks;
        
        for (var j = 0; j < 16; j++) {
            xorGates[i][j] = XOR();
            xorGates[i][j].a <== plaintext[i * 16 + j];
            xorGates[i][j].b <== keystreams[i][j];
            
            // 如果此區塊不應被處理，輸出原始明文
            ciphertext[i * 16 + j] <== blockSelectors[i].out * xorGates[i][j].out + 
                                      (1 - blockSelectors[i].out) * plaintext[i * 16 + j];
        }
    }
}

// 輔助模板：位元組轉 Word
template BytesToWords(numWords) {
    signal input bytes[numWords * 4];
    signal output words[numWords];
    
    for (var i = 0; i < numWords; i++) {
        words[i] <== bytes[i * 4] * (2 ** 24) + 
                     bytes[i * 4 + 1] * (2 ** 16) + 
                     bytes[i * 4 + 2] * (2 ** 8) + 
                     bytes[i * 4 + 3];
    }
}

// XOR 閘
template XOR() {
    signal input a;
    signal input b;
    signal output out;
    
    out <== a + b - 2 * a * b;
    
    // 確保輸入是二進位值
    component bitsA = Num2Bits(8);
    bitsA.in <== a;
    
    component bitsB = Num2Bits(8);
    bitsB.in <== b;
}

// 使用範例：AES-128 CTR 模式，最多 8 個區塊
component main = CTREncrypt(128, 8);