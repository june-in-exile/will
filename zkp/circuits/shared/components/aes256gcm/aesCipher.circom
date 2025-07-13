pragma circom 2.2.2;

include "keyExpansion.circom";
include "byteSubstitution.circom";
include "rowShift.circom";
include "columnMix.circom";
include "../bus.circom";
include "../bits.circom";

template AesCipher(keyBits) {
    var (Nk, Nb, Nr);
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        (Nk, Nb, Nr) = (4,4,10);
    } else if (keyBits == 192) {
        (Nk, Nb, Nr) = (6,4,12);
    } else {
        (Nk, Nb, Nr) = (8,4,14);
    }
    var expandedNk = 4 * (Nr + 1);
    
    signal input {byte} plaintext[16];
    signal input Word() key[Nk];
    signal output {byte} ciphertext[16];
    
    Word() expandedKey[expandedNk] <== ExpandKey(keyBits)(key);
    
    signal {byte} state[Nr + 1][16];
    
    // Initial round - AddRoundKey only
    for (var i = 0; i < 16; i++) {
        addRoundKey0.state[i] <== plaintext[i];
    }
    for (var i = 0; i < 4; i++) {
        addRoundKey0.roundKey[i] <== expandedKey[i];
    }
    for (var i = 0; i < 16; i++) {
        state[0][i] <== addRoundKey0.out[i];
    }
    
    // Main rounds (1 to Nr-1)
    component subBytes[Nr];
    component shiftRows[Nr];
    component mixColumns[Nr - 1]; // No MixColumns in final round
    component addRoundKey[Nr];
    
    for (var round = 1; round < Nr; round++) {
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
component main = AesCipher();