pragma circom 2.2.2;

include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/bitify.circom";
include "../arithmetic.circom";
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
 * Galois Field multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros)
 *
 * Algorithm:
 * c = Σ (a[i] == 1 ? b << i : 0) % p(x)
 */
template GF128Multiply() {
    signal input {byte} aBytes[16];
    signal input {byte} bBytes[16];
    signal output {byte} cBytes[16];
    
    // Convert 16-byte a, b to 128-bit (LSB first order), initialize v = b, c = 0
    signal aBitGroup[16][8];
    signal b[129];
    signal c[129];
    
    for (var byte = 0; byte < 16; byte++) {
        aBitGroup[15 - byte] <== Num2Bits(8)(aBytes[byte]);
    }
    // a <== aBytes[0] * 2**15 + aBytes[1] * 2**14 + aBytes[2] * 2**13 + aBytes[3] * 2**12 + aBytes[4] * 2**11 + aBytes[5] * 2**10 + aBytes[6] * 2**9 + aBytes[7] * 2**8
    //         + aBytes[8] * 2**7 + aBytes[9] * 2**6 + aBytes[10] * 2**5 + aBytes[11] * 2**4 + aBytes[12] * 2**3 + aBytes[13] * 2**2 + aBytes[14] * 2**1 + aBytes[15] * 2**0;
    b[0] <== bBytes[0] * 2**120 + bBytes[1] * 2**112 + bBytes[2] * 2**104 + bBytes[3] * 2**96 + bBytes[4] * 2**88 + bBytes[5] * 2**80 + bBytes[6] * 2**72 + bBytes[7] * 2**64
            + bBytes[8] * 2**56 + bBytes[9] * 2**48 + bBytes[10] * 2**40 + bBytes[11] * 2*32 + bBytes[12] * 2**24 + bBytes[13] * 2**16 + bBytes[14] * 2**8 + bBytes[15] * 2**0;
    c[0] <== 0;

    // p(x) = x^128 + x^7 + x^2 + x + 1
    var p = 2**128 + 2**7 + 2**2 + 2**1 + 2**0;
    
    // signal options[128][2];

    // Process each bit of a
    for (var round = 1; round < 129; round++) {
        var byte = (round - 1) \ 8, bit = (round - 1) % 8;

        // Step 1: If a[round], c += b << round
        c[round] <== c[round - 1] + aBitGroup[byte][bit] * b[round - 1];
        
        // Step 2: c %= p(x)
        (_, b[round]) <== Divide(129, 129)(b[round - 1] * 2, p);
    }
    
    // Convert final result to bytes with modulo 2
    signal cBits[128] <== Num2Bits(128)(c[128]);
    signal cBitGroup[16][8];
    for (var byte = 0; byte < 16; byte++) {
        for (var bit = 0; bit < 8; bit++) {
            cBitGroup[byte][bit] <== cBits[byte * 8 + bit];
        }
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