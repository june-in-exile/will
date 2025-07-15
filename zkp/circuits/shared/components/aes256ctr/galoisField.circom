pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "../arithmetic.circom";
include "../bits.circom";

/**
 * Galois Field multiplication by 2 in GF(2^8) with reduction polynomial x^8 + x^4 + x^3 + x + 1 (0x11b in MSB order)
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
 * Galois Field multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros in LSB order)
 *
 * Idea of Galois Field multiplication with reduction polynomial p(x):
 *   c = Σ (a[i] == 1 ? b << i : 0) mod p(x)
 *
 * Algorithm:
 * - For each bit i of 'a' (from LSB to MSB):
 *   - If a[i] == 1, add (XOR) the current value of b to result c
 *   - Left shift b by 1 position
 *   - If b overflows (bit 128 would be set), reduce using the polynomial
 */
template GF128Multiply() {
    signal input {byte,lsb} aBytes[16];
    signal input {byte,lsb} bBytes[16];
    signal output {byte,lsb} cBytes[16];
    
    // Convert 16-byte a, b to 128-bit (LSB first order), initialize c = 0
    signal aBitGroup[16][8];
    signal bBitGroup[16][8];
    signal cBitGroup[16][8];
    signal aBits[128];
    signal bBits[129][128];
    signal cBits[129][128];
    
    for (var byte = 0; byte < 16; byte++) {
        // Convert each byte to 8 bits
        aBitGroup[byte] <== Num2Bits(8)(aBytes[byte]);
        bBitGroup[byte] <== Num2Bits(8)(bBytes[byte]);
        
        // Rearrange bits: within each byte, reverse bit order (7-bit becomes LSB)
        // This creates LSB-first bit ordering for the entire 128-bit value
        for (var bit = 0; bit < 8; bit++) {
            aBits[byte * 8 + bit] <== aBitGroup[byte][7 - bit];
            bBits[0][byte * 8 + bit] <== bBitGroup[byte][7 - bit];
            cBits[0][byte * 8 + bit] <== 0;
        }
    }
    
    // Main multiplication loop: process each bit of 'a' from LSB to MSB
    for (var round = 1; round < 129; round++) {
        for (var bit = 0; bit < 128; bit++) {
            // Step 1: If a[round-1] == 1, XOR current b into c
            // c = c ⊕ (a[round-1] ? b : 0)
            cBits[round][bit] <== XOR()(cBits[round - 1][bit], aBits[round - 1] * bBits[round - 1][bit]);
            
            // Step 2: Left shift b by 1 bit (equivalent to multiplying by x)
            // Handle the reduction polynomial when MSB overflows
            // By XOR it into positions 0, 1, 2, 7
            if (bit == 0) {
                bBits[round][bit] <== bBits[round - 1][127];
            } else if (bit == 1 || bit == 2 || bit == 7) {
                bBits[round][bit] <== XOR()(bBits[round - 1][127], bBits[round - 1][bit - 1]);
            } else {
                bBits[round][bit] <== bBits[round - 1][bit - 1];
            }
        }
    }

    // Convert final result bits back to bytes (LSB first order)
    for (var byte = 0; byte < 16; byte++) {
        // Reverse bit order within each byte to match expected byte representation
        for (var bit = 0; bit < 8; bit++) {
            cBitGroup[byte][7 - bit] <== cBits[128][byte * 8 + bit];
        }
        // Convert 8 bits back to a byte
        cBytes[byte] <== Bits2Num(8)(cBitGroup[byte]);
    }
}

// /**
//  * GHASH function for AES-GCM
//  * Processes fixed-length input (must be padded to multiple of 16 bytes)
//  */
// template GHash(numBlocks) {
//     signal input {byte} data[numBlocks * 16];
//     signal input {byte} hashKey[16];
//     signal output {byte} result[16];
    
//     // Intermediate results for each block
//     signal intermediateResults[numBlocks + 1][16];
    
//     // Initialize with zeros
//     for (var i = 0; i < 16; i++) {
//         intermediateResults[0][i] <== 0;
//     }
    
//     // Process each 16-byte block
//     component gf128Multiply[numBlocks];
//     signal xorResult[numBlocks][16];
//     for (var block = 0; block < numBlocks; block++) {
//         // XOR current result with data block
//         for (var i = 0; i < 16; i++) {
//             xorResult[block][i] <== BitwiseXor(2,8)(intermediateResults[block][i],data[block * 16 + i]);
//         }
        
//         // Multiply by hashKey in GF(2^128)
//         gf128Multiply[block] = GF128Multiply();
//         for (var i = 0; i < 16; i++) {
//             gf128Multiply[block].x[i] <== xorResult[block][i];
//             gf128Multiply[block].y[i] <== hashKey[i];
//             intermediateResults[block + 1][i] <== gf128Multiply[block].result[i];
//         }
//     }
    
//     // Output final result
//     result <== intermediateResults[numBlocks];
// }