pragma circom 2.2.2;

include "../shared/components/aes256gcm/keyExpansion.circom";
include "../shared/components/aes256gcm/roundKeyAddition.circom";
include "../shared/components/aes256gcm/byteSubstitution.circom";
include "../shared/components/aes256gcm/rowShifting.circom";
include "../shared/components/aes256gcm/columnMixing.circom";
include "../shared/components/bus.circom";
include "../shared/components/bits.circom";

template EncryptBlock(keyBits) {
    // AES-256 uses 14 rounds
    var Nr = 14;
    var Nk = 8; // 256 bits / 32 bits per word
    
    // Inputs
    signal input {byte} plaintext[16];
    input Word() key[Nk];
    
    // Output
    signal output {byte} ciphertext[16];
    
    // Expand the key
    component keyExpansion = ExpandKey(256);
    for (var i = 0; i < Nk; i++) {
        keyExpansion.key[i] <== key[i];
    }
    
    // State array to track transformations
    signal {byte} state[Nr + 1][16];
    
    // Initial round - AddRoundKey only
    component addRoundKey0 = AddRoundKey();
    for (var i = 0; i < 16; i++) {
        addRoundKey0.state[i] <== plaintext[i];
    }
    for (var i = 0; i < 4; i++) {
        addRoundKey0.roundKey[i] <== keyExpansion.expandedKey[i];
    }
    for (var i = 0; i < 16; i++) {
        state[0][i] <== addRoundKey0.out[i];
    }
    
    // Main rounds (1 to Nr-1)
    component subBytes[Nr];
    component shiftRows[Nr];
    component mixColumns[Nr - 1]; // No MixColumns in final round
    component addRoundKey[Nr];
    
    for (var round = 1; round <= Nr - 1; round++) {
        // SubBytes
        subBytes[round - 1] = SubBytes();
        for (var i = 0; i < 16; i++) {
            subBytes[round - 1].in[i] <== state[round - 1][i];
        }
        
        // ShiftRows
        shiftRows[round - 1] = ShiftRows();
        for (var i = 0; i < 16; i++) {
            shiftRows[round - 1].in[i] <== subBytes[round - 1].out[i];
        }
        
        // MixColumns
        mixColumns[round - 1] = MixColumns();
        for (var i = 0; i < 16; i++) {
            mixColumns[round - 1].in[i] <== shiftRows[round - 1].out[i];
        }
        
        // AddRoundKey
        addRoundKey[round - 1] = AddRoundKey();
        for (var i = 0; i < 16; i++) {
            addRoundKey[round - 1].state[i] <== mixColumns[round - 1].out[i];
        }
        for (var i = 0; i < 4; i++) {
            addRoundKey[round - 1].roundKey[i] <== keyExpansion.expandedKey[round * 4 + i];
        }
        for (var i = 0; i < 16; i++) {
            state[round][i] <== addRoundKey[round - 1].out[i];
        }
    }
    
    // Final round (no MixColumns)
    // SubBytes
    subBytes[Nr - 1] = SubBytes();
    for (var i = 0; i < 16; i++) {
        subBytes[Nr - 1].in[i] <== state[Nr - 1][i];
    }
    
    // ShiftRows
    shiftRows[Nr - 1] = ShiftRows();
    for (var i = 0; i < 16; i++) {
        shiftRows[Nr - 1].in[i] <== subBytes[Nr - 1].out[i];
    }
    
    // AddRoundKey
    addRoundKey[Nr - 1] = AddRoundKey();
    for (var i = 0; i < 16; i++) {
        addRoundKey[Nr - 1].state[i] <== shiftRows[Nr - 1].out[i];
    }
    for (var i = 0; i < 4; i++) {
        addRoundKey[Nr - 1].roundKey[i] <== keyExpansion.expandedKey[Nr * 4 + i];
    }
    for (var i = 0; i < 16; i++) {
        ciphertext[i] <== addRoundKey[Nr - 1].out[i];
    }
}

// Example instantiation
component main = EncryptBlock(256);