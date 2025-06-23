pragma circom 2.0.0;

// 最簡化的 AES-GCM 解密驗證電路
// 確保所有約束都是二次的，且所有輸入都正確初始化

template ZKIsEqual() {
    signal input in[2];
    signal output out;
    
    component isz = ZKIsZero();
    isz.in <== in[1] - in[0];
    out <== isz.out;
}

template ZKIsZero() {
    signal input in;
    signal output out;
    
    signal inv;
    inv <-- in != 0 ? 1/in : 0;
    out <== -in*inv + 1;
    in*out === 0;
}

template ZKAnd() {
    signal input a;
    signal input b;
    signal output out;
    
    out <== a*b;
}

// 多重 AND 門 - 遞歸版本
template ZKMultiAnd(n) {
    signal input in[n];
    signal output out;
    
    if (n == 1) {
        out <== in[0];
    } else if (n == 2) {
        component and = ZKAnd();
        and.a <== in[0];
        and.b <== in[1];
        out <== and.out;
    } else {
        component and = ZKAnd();
        component rest = ZKMultiAnd(n-1);
        
        and.a <== in[0];
        for (var i = 0; i < n-1; i++) {
            rest.in[i] <== in[i+1];
        }
        and.b <== rest.out;
        out <== and.out;
    }
}

// 簡單的偽隨機數生成
template ZKPseudoRandom() {
    signal input seed;
    signal input salt;
    signal output out;
    
    // 簡單的線性同餘生成器
    out <== seed * 1103515245 + salt;
}

// 超簡化的雜湊函數
template ZKSimpleHash(inputLen) {
    signal input in[inputLen];
    signal output out[4];  // 只輸出 4 位元組
    
    component rand[4];
    for (var i = 0; i < 4; i++) {
        rand[i] = ZKPseudoRandom();
        rand[i].seed <== in[i % inputLen];
        rand[i].salt <== i * 12345;
        out[i] <== rand[i].out;
    }
}

// 簡化的密鑰流
template ZKKeystream() {
    signal input key0;
    signal input iv0;
    signal input counter;
    signal output out;
    
    component prng = ZKPseudoRandom();
    prng.seed <== key0 + iv0;
    prng.salt <== counter;
    out <== prng.out;
}

// 主要的解密驗證電路
template AESGCMDecryptProof(dataLen) {
    // 公開輸入
    signal input ciphertext[dataLen];
    signal input iv[12];
    signal input authTag[16];
    signal input plaintextHash[4];    // 簡化為 4 位元組
    
    // 私密輸入
    signal input key[32];
    signal input plaintext[dataLen];
    
    // 輸出
    signal output valid;
    
    // Step 1: 驗證明文雜湊
    component hash = ZKSimpleHash(dataLen);
    for (var i = 0; i < dataLen; i++) {
        hash.in[i] <== plaintext[i];
    }
    
    component hashCheck[4];
    for (var i = 0; i < 4; i++) {
        hashCheck[i] = ZKIsEqual();
        hashCheck[i].in[0] <== hash.out[i];
        hashCheck[i].in[1] <== plaintextHash[i];
    }
    
    component hashValid = ZKMultiAnd(4);
    for (var i = 0; i < 4; i++) {
        hashValid.in[i] <== hashCheck[i].out;
    }
    
    // Step 2: 解密驗證
    component keystream[dataLen];
    for (var i = 0; i < dataLen; i++) {
        keystream[i] = ZKKeystream();
        keystream[i].key0 <== key[0];
        keystream[i].iv0 <== iv[0];
        keystream[i].counter <== i;
    }
    
    component decryptCheck[dataLen];
    for (var i = 0; i < dataLen; i++) {
        decryptCheck[i] = ZKIsEqual();
        decryptCheck[i].in[0] <== plaintext[i] + keystream[i].out;
        decryptCheck[i].in[1] <== ciphertext[i];
    }
    
    component decryptValid = ZKMultiAnd(dataLen);
    for (var i = 0; i < dataLen; i++) {
        decryptValid.in[i] <== decryptCheck[i].out;
    }
    
    // Step 3: 簡化的認證標籤驗證
    component tagGen[4];
    for (var i = 0; i < 4; i++) {
        tagGen[i] = ZKPseudoRandom();
        tagGen[i].seed <== key[i] + iv[i] + ciphertext[i % dataLen] + plaintext[i % dataLen];
        tagGen[i].salt <== i * 54321;
    }
    
    component tagCheck[4];
    for (var i = 0; i < 4; i++) {
        tagCheck[i] = ZKIsEqual();
        tagCheck[i].in[0] <== tagGen[i].out;
        tagCheck[i].in[1] <== authTag[i];
    }
    
    component tagValid = ZKMultiAnd(4);
    for (var i = 0; i < 4; i++) {
        tagValid.in[i] <== tagCheck[i].out;
    }
    
    // Step 4: 最終驗證
    component finalCheck1 = ZKAnd();
    finalCheck1.a <== hashValid.out;
    finalCheck1.b <== decryptValid.out;
    
    component finalCheck2 = ZKAnd();
    finalCheck2.a <== finalCheck1.out;
    finalCheck2.b <== tagValid.out;
    
    valid <== finalCheck2.out;
}

// 主電路實例 - 4 位元組資料
component main = AESGCMDecryptProof(4);

/*
使用說明：

# 1. 編譯
circom decryption.circom --r1cs --wasm --sym

# 2. 生成見證
cd decryption_js
node generate_witness.js decryption.wasm ../input.json ../witness.wtns
cd ../..

# 3. 如果成功，繼續設置可信設定
npm run setup

# 4. 生成證明
npm run prove

# 5. 驗證證明
npm run verify
*/