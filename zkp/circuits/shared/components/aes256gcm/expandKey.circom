pragma circom 2.2.2;

include "circomlib/circuits/gates.circom";

// 字旋轉模板（將 4 字節向左旋轉 1 位）
template RotWord() {
    signal input in[4];
    signal output out[4];
    
    // 左旋轉：[a, b, c, d] -> [b, c, d, a]
    out[0] <== in[1];
    out[1] <== in[2];
    out[2] <== in[3];
    out[3] <== in[0];
}


// XOR operation template
template XORWord() {
    signal input a[4];
    signal input b[4];
    signal output out[4];
    
    component xor[4];
    for (var i = 0; i < 4; i++) {
        xor[i] = XOR();
        xor[i].a <== a[i];
        xor[i].b <== b[i];
        out[i] <== xor[i].out;
    }
}

// Round constant lookup
template RCon() {
    signal input round;
    signal output out;
    
    // Use QuinSelector to implement RCON lookup
    component selector = QuinSelector(14);
    selector.in <== round;
    
    // RCON values (only need first 14)
    selector.c[0] <== 0x01; selector.c[1] <== 0x02; selector.c[2] <== 0x04; selector.c[3] <== 0x08;
    selector.c[4] <== 0x10; selector.c[5] <== 0x20; selector.c[6] <== 0x40; selector.c[7] <== 0x80;
    selector.c[8] <== 0x1b; selector.c[9] <== 0x36; selector.c[10] <== 0x6c; selector.c[11] <== 0xd8;
    selector.c[12] <== 0xab; selector.c[13] <== 0x4d;
    
    out <== selector.out;
}

// Main key expansion template
template ExpandKey() {
    signal input key[32];
    signal output expandedKey[240];
    
    // Copy original key to first 32 bytes of expanded key
    for (var i = 0; i < 32; i++) {
        expandedKey[i] <== key[i];
    }
    
    // Key expansion loop
    for (var i = 32; i < 240; i += 4) {
        // Get previous word
        signal prevWord[4];
        for (var j = 0; j < 4; j++) {
            prevWord[j] <== expandedKey[i - 4 + j];
        }
        
        signal newWord[4];
        
        // Check if special processing is needed
        if (i % 32 == 0) {
            // Every 32 bytes (8 words) perform rotation and substitution
            component rot = RotWord();
            component sub = SubWord();
            component rcon = RCon();
            component xorRcon = XORWord();
            
            // Rotation
            for (var j = 0; j < 4; j++) {
                rot.in[j] <== prevWord[j];
            }
            
            // Substitution
            for (var j = 0; j < 4; j++) {
                sub.in[j] <== rot.out[j];
            }
            
            // Get round constant
            rcon.round <== (i / 32) - 1;
            
            // XOR with round constant
            xorRcon.a[0] <== sub.out[0];
            xorRcon.a[1] <== sub.out[1];
            xorRcon.a[2] <== sub.out[2];
            xorRcon.a[3] <== sub.out[3];
            
            xorRcon.b[0] <== rcon.out;
            xorRcon.b[1] <== 0;
            xorRcon.b[2] <== 0;
            xorRcon.b[3] <== 0;
            
            for (var j = 0; j < 4; j++) {
                newWord[j] <== xorRcon.out[j];
            }
            
        } else if (i % 32 == 16) {
            // At byte 16 of every 32 bytes, perform substitution
            component sub = SubWord();
            
            for (var j = 0; j < 4; j++) {
                sub.in[j] <== prevWord[j];
            }
            
            for (var j = 0; j < 4; j++) {
                newWord[j] <== sub.out[j];
            }
            
        } else {
            // Other cases, direct copy
            for (var j = 0; j < 4; j++) {
                newWord[j] <== prevWord[j];
            }
        }
        
        // XOR with corresponding word from previous round
        signal prevRoundWord[4];
        for (var j = 0; j < 4; j++) {
            prevRoundWord[j] <== expandedKey[i - 32 + j];
        }
        
        component finalXor = XORWord();
        for (var j = 0; j < 4; j++) {
            finalXor.a[j] <== newWord[j];
            finalXor.b[j] <== prevRoundWord[j];
        }
        
        // Write final result to expanded key
        for (var j = 0; j < 4; j++) {
            expandedKey[i + j] <== finalXor.out[j];
        }
    }
}