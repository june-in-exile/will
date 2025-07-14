pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "../bits.circom";

/**
 * Galois Field multiplication by 2 in GF(2^8) with reduction polynomial x^8 + x^4 + x^3 + x + 1 (0x11b)
 * 
 * Algorithm:
 * 1. Left shift the input by 1 bit
 * 2. If the original value had bit 7 set (>= 0x80), XOR with 0x1b
 */
template GF8Mul2() {
    signal input {byte} in;
    signal output {byte} out;

    // Extract the most significant bit (bit 7)
    signal bits[8] <== Num2Bits(8)(in);
    signal msb <== bits[7];
    
    // Left shift by 1 and mask to keep only lower 8 bits
    signal shifted <== Mask(9,0xff)(in * 2);
    
    // Apply polynomial reduction if MSB was set
    out <== BitwiseXor(2,8)([shifted, msb * 0x1b]);
}

/**
 * Galois Field multiplication by 3 in GF(2^8)
 * 
 * Algorithm: 3 * x = (2 * x) ⊕ x
 */
template GF8Mul3() {
    signal input {byte} in;
    signal output {byte} out;
    
    signal mul2 <== GF8Mul2()(in);
    
    out <== BitwiseXor(2,8)([mul2,in]);
}

/**
 * Galois Field multiplication in GF(2^8) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros)
 */
template GF128Multiply() {
    signal input {byte} a[16];
    signal input {byte} b[16];
    signal output {byte} c[16];
    
    // Convert x bytes to bits (MSB first order)
    // signal aBits[128];
    signal aBits[16][8];
    component aToBits[16];
    
    for (var i = 0; i < 16; i++) {
        aToBits[i] = Num2Bits(8);
        aToBits[i].in <== x[i];
        
        // Map to match TypeScript's bit ordering
        // byteIndex = Math.floor(i / 8) and bitIndex = 7 - (i % 8)
        for (var j = 0; j < 8; j++) {
            aBits[i * 8 + j] <== aToBits[i].out[7 - j];
        }
    }
    
    // Initialize working arrays for the algorithm
    // We need to track v and result through 128 iterations
    signal vBits[129][128];      // v in bit representation
    signal resultBits[129][128]; // result in bit representation
    
    // Convert y to bits and initialize v = y
    component yToBits[16];
    for (var i = 0; i < 16; i++) {
        yToBits[i] = Num2Bits(8);
        yToBits[i].in <== y[i];
        
        for (var j = 0; j < 8; j++) {
            // Store in little-endian bit order within bytes
            vBits[0][i * 8 + j] <== yToBits[i].out[j];
        }
    }
    
    // Initialize result = 0
    for (var i = 0; i < 128; i++) {
        resultBits[0][i] <== 0;
    }
    
    // Main loop: process each bit of x
    for (var iter = 0; iter < 128; iter++) {
        // Step 1: If x[iter] == 1, XOR v to result
        for (var j = 0; j < 128; j++) {
            resultBits[iter + 1][j] <== resultBits[iter][j] + aBits[iter] * vBits[iter][j];
        }
        
        // Step 2: Right shift v by one bit
        signal carry <== vBits[iter][0]; // LSB becomes carry
        
        // Shift right
        for (var j = 0; j < 127; j++) {
            vBits[iter + 1][j] <== vBits[iter][j + 1];
        }
        vBits[iter + 1][127] <== 0; // MSB becomes 0
        
        // Step 3: If carry = 1, XOR with reduction polynomial
        // Polynomial 0xE1 = 11100001 affects byte 0 (most significant byte)
        // This means bits at positions 0, 1, 2, 7 of the most significant byte
        
        // XOR the reduction polynomial bits if carry = 1
        // Note: In our bit array, indices 120-127 represent the most significant byte
        vBits[iter + 1][120] <== vBits[iter + 1][120] + carry; // bit 7 of MSB
        vBits[iter + 1][125] <== vBits[iter + 1][125] + carry; // bit 2 of MSB
        vBits[iter + 1][126] <== vBits[iter + 1][126] + carry; // bit 1 of MSB
        vBits[iter + 1][127] <== vBits[iter + 1][127] + carry; // bit 0 of MSB
    }
    
    // Convert final result bits to bytes with modulo 2
    component resultBitsToBytes[16];
    component modulo2[128];
    
    for (var i = 0; i < 128; i++) {
        modulo2[i] = Mod2();
        modulo2[i].in <== resultBits[128][i];
    }
    
    for (var i = 0; i < 16; i++) {
        resultBitsToBytes[i] = Bits2Num(8);
        
        for (var j = 0; j < 8; j++) {
            resultBitsToBytes[i].in[j] <== modulo2[i * 8 + j].out;
        }
        
        result[i] <== resultBitsToBytes[i].out;
    }
}

/**
 * GHASH function for AES-GCM
 * Processes fixed-length input (must be padded to multiple of 16 bytes)
 */
template GHash(numBlocks) {
    signal input {byte} data[numBlocks * 16];
    signal input {byte} hashKey[16];
    signal output {byte} result[16];
    
    // Intermediate results for each block
    signal intermediateResults[numBlocks + 1][16];
    
    // Initialize with zeros
    for (var i = 0; i < 16; i++) {
        intermediateResults[0][i] <== 0;
    }
    
    // Process each 16-byte block
    component gf128Multiply[numBlocks];
    signal xorResult[numBlocks][16];
    for (var block = 0; block < numBlocks; block++) {
        // XOR current result with data block
        for (var i = 0; i < 16; i++) {
            xorResult[block][i] <== BitwiseXor(2,8)(intermediateResults[block][i],data[block * 16 + i]);
        }
        
        // Multiply by hashKey in GF(2^128)
        gf128Multiply[block] = GF128Multiply();
        for (var i = 0; i < 16; i++) {
            gf128Multiply[block].x[i] <== xorResult[block][i];
            gf128Multiply[block].y[i] <== hashKey[i];
            intermediateResults[block + 1][i] <== gf128Multiply[block].result[i];
        }
    }
    
    // Output final result
    result <== intermediateResults[numBlocks];
}