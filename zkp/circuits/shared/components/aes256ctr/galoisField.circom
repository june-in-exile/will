pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "../bits.circom";

/**
 * Galois Field multiplication by 2 in GF(2^8)
 * 
 * This implements the "xtime" operation which multiplies a byte by 2
 * in the Galois Field GF(2^8) with irreducible polynomial 0x11b.
 * 
 * Algorithm:
 * 1. Left shift the input by 1 bit
 * 2. If the original value had bit 7 set (>= 0x80), XOR with 0x1b
 * 
 * This is equivalent to polynomial multiplication modulo the AES polynomial.
 */
template GFMul2() {
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
 * Multiplication by 3 is implemented as: 3 * x = (2 * x) XOR x
 * This uses the distributive property in GF(2^8) where addition is XOR.
 */
template GFMul3() {
    signal input {byte} in;
    signal output {byte} out;
    
    signal mul2 <== GFMul2()(in);
    
    out <== BitwiseXor(2,8)([mul2,in]);
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