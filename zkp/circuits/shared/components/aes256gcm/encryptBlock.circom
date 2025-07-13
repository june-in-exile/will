pragma circom 2.2.2;

include "keyExpansion.circom";
include "roundKeyAddition.circom";
include "byteSubstitution.circom";
include "rowShifting.circom";
include "columnMixing.circom";
include "../bus.circom";
include "../bits.circom";

template EncryptBlock(keyBits) {
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
    input Word() key[Nk];
    signal output {byte} ciphertext[16];
    
    // Expand the key
    // component keyExpansion = ExpandKey(keyBits);
    // for (var i = 0; i < Nk; i++) {
    //     keyExpansion.key[i] <== key[i];
    // }
    
    // State array to track transformations
    signal {byte} state[Nr + 1][16];
    
    // Initial round - AddRoundKey only
    Word() roundKey[expandedNk] <== ExpandKey(keyBits)(key);
    Word() roundKeyGroup[Nr + 1][4];
    (roundKeyGroup[0][0],roundKeyGroup[0][1],roundKeyGroup[0][2],roundKeyGroup[0][3]) <== (roundKey[0],roundKey[1],roundKey[2],roundKey[3]);
    state[0] <== AddRoundKey()(plaintext,roundKeyGroup[0]);
    
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
            addRoundKey[round - 1].roundKey[i] <== roundKey[round * 4 + i];
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
        addRoundKey[Nr - 1].roundKey[i] <== roundKey[Nr * 4 + i];
    }
    for (var i = 0; i < 16; i++) {
        ciphertext[i] <== addRoundKey[Nr - 1].out[i];
    }
}