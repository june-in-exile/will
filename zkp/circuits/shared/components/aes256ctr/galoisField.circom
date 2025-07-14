pragma circom 2.2.2;

include "circomlib/circuits/mux1.circom";
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
 * Galois Field multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros)
 * Galois Field multiplication 乘法：result = Σ (x[i] == 1 ? y shifted right i : 0)
 */
template GF128Multiply() {
    signal input {byte} aBytes[16];
    signal input {byte} bBytes[16];
    signal output {byte} cBytes[16];
    
    // Convert 16-byte a, b to 128-bit (MSB first order), initialize v = b, c = 0
    signal aBits[16][8];
    signal b[129];
    signal c[129];
    
    for (var byte = 0; byte < 16; i++) {
        aBits[byte] <== Num2Bits(aBytes[byte]);
    }
    // a <== aBytes[0] * 2**15 + aBytes[1] * 2**14 + aBytes[2] * 2**13 + aBytes[3] * 2**12 + aBytes[4] * 2**11 + aBytes[5] * 2**10 + aBytes[6] * 2**9 + aBytes[7] * 2**8
    //         + aBytes[8] * 2**7 + aBytes[9] * 2**6 + aBytes[10] * 2**5 + aBytes[11] * 2**4 + aBytes[12] * 2**3 + aBytes[13] * 2**2 + aBytes[14] * 2**1 + aBytes[15] * 2**0;
    b[0] <== bBytes[0] * 2**15 + bBytes[1] * 2**14 + bBytes[2] * 2**13 + bBytes[3] * 2**12 + bBytes[4] * 2**11 + bBytes[5] * 2**10 + bBytes[6] * 2**9 + bBytes[7] * 2**8
            + bBytes[8] * 2**7 + bBytes[9] * 2**6 + bBytes[10] * 2**5 + bBytes[11] * 2**4 + bBytes[12] * 2**3 + bBytes[13] * 2**2 + bBytes[14] * 2**1 + bBytes[15] * 2**0;
    c[0] <== 0;
    
    signal carry[128];
    signal options[128][2];

    carry[0] <== 0;

    // Process each bit of a
    for (var round = 1; round < 129; round++) {
        var byte = round \ 8, bit = 7 - round % 8;

        // Step 1: c[round] = (a[round - 1] == 1) ? c[round - 1] : c[round - 1] ⊕ b[round - 1]
        (options[round - 1][0], options[round - 1][1]) <== (c[round - 1], BitwiseXor(2,128)(c[round - 1],b[round - 1]));
        c[round] <== Mux1(options, aBits[byte][bit]);
        
        // Step 2: b[round] = carry[round - 1] || (b[round - 1] >> 1), carry[round] = LSB(b[round]), 
        b[round] <== ShiftRight(128, 1)(b[round - 1]);
        carry[round] <== b[round][0];
        
        
        // Shift right
        for (var bit = 0; bit < 127; bit++) {
            vBits[round + 1][bit] <== vBits[round][bit + 1];
        }
        vBits[round + 1][127] <== 0; // MSB becomes 0
        
        // Step 3: If carry = 1, XOR with reduction polynomial
        // Polynomial 0xE1 = 11100001 affects byte 0 (most significant byte)
        // This means bits at positions 0, 1, 2, 7 of the most significant byte
        
        // XOR the reduction polynomial bits if carry = 1
        // Note: In our bit array, indices 120-127 represent the most significant byte
        vBits[round + 1][120] <== vBits[round + 1][120] + carry; // bit 7 of MSB
        vBits[round + 1][125] <== vBits[round + 1][125] + carry; // bit 2 of MSB
        vBits[round + 1][126] <== vBits[round + 1][126] + carry; // bit 1 of MSB
        vBits[round + 1][127] <== vBits[round + 1][127] + carry; // bit 0 of MSB
    }
    
    // Convert final result bits to bytes with modulo 2
    component cBitsToBytes[16];
    component modulo2[128];
    
    for (var i = 0; i < 128; i++) {
        modulo2[i] = Mod2();
        modulo2[i].in <== cBits[128][i];
    }
    
    for (var i = 0; i < 16; i++) {
        cBitsToBytes[i] = Bits2Num(8);
        
        for (var bit = 0; bit < 8; bit++) {
            cBitsToBytes[i].in[bit] <== modulo2[i * 8 + bit].out;
        }
        
        result[i] <== cBitsToBytes[i].out;
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