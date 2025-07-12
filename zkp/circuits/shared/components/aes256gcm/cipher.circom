pragma circom 2.0.0;

// Include your existing templates
include "keyExpansion.circom";
include "byteSubstitution.circom";
include "shiftRows.circom";
include "mixColumns.circom";
include "../bits.circom";

// Helper template to convert byte array to Word array
template BytesToWords() {
    signal input {byte} bytes[16];
    signal output Word() words[4];
    
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            words[i].bytes[j] <== bytes[i * 4 + j];
        }
    }
}

// Helper template to convert Word array to byte array
template WordsToBytes() {
    signal input Word() words[4];
    signal output {byte} bytes[16];
    
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            bytes[i * 4 + j] <== words[i].bytes[j];
        }
    }
}

// AddRoundKey template - XOR state with round key
template AddRoundKey() {
    signal input {byte} state[16];
    signal input Word() roundKey[4];
    signal output {byte} out[16];
    
    // Convert round key words to bytes
    component wordsToBytes = WordsToBytes();
    for (var i = 0; i < 4; i++) {
        wordsToBytes.words[i] <== roundKey[i];
    }
    
    // XOR each byte of state with corresponding round key byte
    component xor[16];
    for (var i = 0; i < 16; i++) {
        xor[i] = BitwiseXor(2, 8);
        xor[i].in[0] <== state[i];
        xor[i].in[1] <== wordsToBytes.bytes[i];
        out[i] <== xor[i].out;
    }
}

// Main AES-256 encryption block template
template Cipher() {
    // AES-256 uses 14 rounds
    var Nr = 14;
    var Nk = 8; // 256 bits / 32 bits per word
    
    // Inputs
    signal input {byte} plaintext[16];
    signal input Word() key[Nk];
    
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
component main = Cipher();