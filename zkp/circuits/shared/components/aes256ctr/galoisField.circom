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
 * Output Bit Array Mapping:
 * - bits[0] = x^0 coefficient → bytes[0] bit 7
 * - bits[1] = x^1 coefficient → bytes[0] bit 6
 * - ...
 * - bits[7] = x^7 coefficient → bytes[0] bit 0
 * - bits[8] = x^8 coefficient → bytes[1] bit 7
 * - ...
 * - bits[127] = x^127 coefficient → bytes[15] bit 0
 * 
 * Example:
 * - Input bytes[0] = 0x80 (10000000₂) → bits[0-7] = [1,0,0,0,0,0,0,0]
 * - Input bytes[0] = 0x01 (00000001₂) → bits[0-7] = [0,0,0,0,0,0,0,1]
 */
template GF128BytesToBits() {
    signal input {byte} bytes[16];
    signal output {bit} bits[128];
    
    component byteToBits[16];
    
    for (var byteIdx = 0; byteIdx < 16; byteIdx++) {
        byteToBits[byteIdx] = Num2Bits(8);
        byteToBits[byteIdx].in <== bytes[byteIdx];
        
        for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
            bits[byteIdx * 8 + bitIdx] <== byteToBits[byteIdx].out[7 - bitIdx];
        }
    }
}

/**
 * Input Bit Array Mapping:
 * - bits[0] = x^0 coefficient → bytes[0] bit 7
 * - bits[1] = x^1 coefficient → bytes[0] bit 6
 * - ...
 * - bits[7] = x^7 coefficient → bytes[0] bit 0
 * - bits[8] = x^8 coefficient → bytes[1] bit 7
 * - ...
 * - bits[127] = x^127 coefficient → bytes[15] bit 0
 * 
 * Example:
 * - Input bits[0-7] = [1,0,0,0,0,0,0,0] → bytes[0] = 0x80 (10000000₂)
 * - Input bits[0-7] = [0,0,0,0,0,0,0,1] → bytes[0] = 0x01 (00000001₂)
 */
template GF128BitsToBytes() {
    signal input {bit} bits[128];
    signal output {byte} bytes[16];
    
    component bitsToBytes[16];
    
    for (var byteIdx = 0; byteIdx < 16; byteIdx++) {
        bitsToBytes[byteIdx] = Bits2Num(8);
        
        for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
            bitsToBytes[byteIdx].in[7 - bitIdx] <== bits[byteIdx * 8 + bitIdx];
        }
        
        bytes[byteIdx] <== bitsToBytes[byteIdx].out;
    }
}

/**
 * Galois Field multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros in LSB-first order)
 *
 * Idea of Galois Field multiplication with reduction polynomial p(x):
 *   c = Σ (a[i] == 1 ? b >> i : 0) mod p(x)
 *
 * Algorithm:
 * - For each bit i of 'a' (from LSB to MSB):
 *   - If a[i] == 1, c ^= b
 *   - b >>= 1
 *   - If b overflows, reduce using the polynomial
 */
template GF128Multiply() {
    signal input {byte} aBytes[16];
    signal input {byte} bBytes[16];
    signal output {byte} cBytes[16];
    
    signal {bit} aBits[128];
    signal {bit} bBits[129][128];
    signal {bit} cBits[129][128];

    // Convert 16-byte a, b to 128-bit, initialize c = 0
    aBits <== GF128BytesToBits()(aBytes);
    bBits[0] <== GF128BytesToBits()(bBytes);

    for (var bit = 0; bit < 128; bit++) {
        cBits[0][bit] <== 0;
    }
    
    // Process each bit of 'a' from MSB to LSB
    for (var round = 1; round <= 128; round++) {
        for (var bit = 0; bit < 128; bit++) {
            // Step 1: If a[round-1] == 1, XOR current b into c
            // c = c ⊕ (a[round-1] ? b : 0)
            cBits[round][bit] <== XOR()(cBits[round - 1][bit], aBits[round - 1] * bBits[round - 1][bit]);
            
            // Step 2: Right shift b by 1 bit (equivalent to multiplying by x)
            // Handle the reduction polynomial when MSB overflows
            // By XOR it into positions 0, 1, 2, 7
            if (bit == 0) {
                // bBits[round - 1][127] is the carry
                bBits[round][bit] <== bBits[round - 1][127];
            } else if (bit == 1 || bit == 2 || bit == 7) {
                bBits[round][bit] <== XOR()(bBits[round - 1][127], bBits[round - 1][bit - 1]);
            } else {
                bBits[round][bit] <== bBits[round - 1][bit - 1];
            }
        }
    }

    // Convert final result bits back to bytes
    cBytes <== GF128BitsToBytes()(cBits[128]);
}

/**
 * Optimized Galois Field multiplication in GF(2^128)
 * Reduction polynomial: x^128 + x^7 + x^2 + x + 1
 * 
 * This implementation uses a three-round approach to handle overflows efficiently:
 * - Round 1: Calculate initial multiplication with first-level overflows
 * - Round 2: Process first-level overflows with reduction polynomial
 * - Round 3: Process remaining second-level overflows
 * 
 * The key optimization is accumulating contributions instead of iterative XOR operations,
 * which significantly reduces the number of constraints.
 *
 * Demonstration of the Algorithm with GF(2^8):
 *  
 *     signal input {bit} a[8] = 10010001 (0x91);
 *     signal input {bit} b[8] = 11101111 (0xef);
 *     signal output {bit} c[8];
 *
 *     p(x) = 1 + x + x^3 + x^4 -> p_x = [0,1,3,4]
 *
 *     ====================== Round 1 ======================
 *
 *       a:    1  0  0  1  0  0  0  1
 *       b:    1  1  1  0  1  1  1  1
 *
 *    aBit:    0:7
 *    bBit:    0:7
 *
 *    ctr1:    1  1  1  0  1  1  1  1                     
 *                1  1  0  1  1  1  1  0                  
 *                   1  0  1  1  1  1  0  0               
 *                      1  2  2  1  2  1  1  1            
 *                         2  2  1  2  1  1  1  0         
 *                            2  1  2  1  1  1  0  0      
 *                               1  2  1  1  1  0  0  0   
 *                                  3  2  2  1  1  1  1  1
 *             ______________________
 *  valid1:    1  1  1  1  2  2  1  3
 *   over1:    2  2  1  1  1  1  1
 *
 *     ====================== Round 2 ======================
 *
 *     p_x:    [0,1,3,4]
 *   over1:    2  2  1  1  1  1  1
 *
 *    pIdx:    0:3
 * overBit:    0:6
 *
 *    ctr2:    2  2  1  1  1  1  1            
 *                4  3  2  2  2  2  1         
 *                      4  4  3  3  2  1  1   
 *                         6  5  4  3  2  2  1
 *             ______________________
 *  valid2:    2  4  3  4  6  5  4  3
 *   over2:    2  2  1
 *
 *     ====================== Round 3 ======================
 *
 *     p_x:    [0,1,3,4]
 *   over2:    2  2  1
 *
 *    pIdx:    0:3
 * overBit:    0:2
 *
 *    ctr3:    2  2  1            
 *                4  3  1         
 *                      3  2  1   
 *                         4  3  1
 *             ___________________
 *  valid3:    2  4  3  3  4  3  1
 *
 *     ===================== Sum & Mod =====================
 *
 *   valid1    1  1  1  1  2  2  1  3
 * + valid2    2  4  3  4  6  5  4  3
 * + valid3    2  4  3  3  4  3  1
 * =    sum    5  9  7  8 12 10  6  6
 *
 *    mod2:    1  1  1  0  0  0  0  0
 *      c =    11100000 (0xe0)
 */
template GF128MultiplyOptimized() {
    signal input {byte} aBytes[16];
    signal input {byte} bBytes[16];
    signal output {byte} cBytes[16];
    
    signal {bit} aBits[128];
    signal {bit} bBits[128];
    
    // Convert 16-byte a, b to 128-bit
    aBits <== GF128BytesToBits()(aBytes);
    bBits <== GF128BytesToBits()(bBytes);

    // Reduction polynomial coefficients: 1 + x + x^2 + x^7
    var p_x[4] = [0, 1, 2, 7];

    // Counter arrays for accumulating contributions
    signal counter1[128][128];
    signal counter2[4][127];
    signal counter3[4][6];

    // Valid bits that fit within 128-bit result
    signal valid1[128];
    signal valid2[128];
    signal valid3[13];  // Only bits 0-12 can have contributions from round 3

    // Overflow bits that need reduction
    signal overflow1[127];  // Maximum 127 overflow bits from round 1
    signal overflow2[6];    // Maximum 6 overflow bits from round 2

    // ===== Round 1: Main multiplication =====
    // For each bit of 'a', accumulate b shifted right by that bit position
    for (var aBit = 0; aBit < 128; aBit++) {
        for (var bBit = 0; bBit < 128; bBit++) {
            var prevBBit = bBit + 1;
            
            // Base case: first a-bit or no previous b-bit to carry
            if (aBit == 0 || prevBBit >= 128) {
                counter1[aBit][bBit] <== aBits[aBit] * bBits[bBit];
            } else {
                // Accumulate: current contribution + carried value from previous iteration
                counter1[aBit][bBit] <== counter1[aBit - 1][prevBBit] + aBits[aBit] * bBits[bBit];
            }
        }
    }

    // Extract valid bits (0-127) and overflow bits (128+) from round 1
    for (var i = 0; i < 128; i++) {
        valid1[i] <== counter1[i][0];

        if (i < 127) {
            overflow1[i] <== counter1[127][i + 1];
        }
    }

    // ===== Round 2: Process first-level overflows =====
    // Apply reduction polynomial to overflow bits from round 1
    for (var pIdx = 0; pIdx < 4; pIdx++) {
        for (var over1Bit = 0; over1Bit < 127; over1Bit++) {
            if (pIdx == 0) {
                // Initialize with overflow values
                counter2[pIdx][over1Bit] <== overflow1[over1Bit];
            } else {
                // Calculate previous overflow bit position based on polynomial terms
                var prevOver1Bit = over1Bit + (p_x[pIdx] - p_x[pIdx - 1]);
                if (prevOver1Bit < 127) {
                    // Accumulate from previous polynomial term
                    counter2[pIdx][over1Bit] <== counter2[pIdx - 1][prevOver1Bit] + overflow1[over1Bit];
                } else {
                    // No previous term to accumulate
                    counter2[pIdx][over1Bit] <== overflow1[over1Bit];
                }
            }
        }
    }
    
    // Extract contributions to valid bits and remaining overflows from round 2
    for (var i = 0; i < 128; i++) {
        if (i < p_x[1]) {
            valid2[i] <== counter2[0][i - p_x[0]];
        } else if (i < p_x[2]) {
            valid2[i] <== counter2[1][i - p_x[1]];
        } else if (i < p_x[3]) {
            valid2[i] <== counter2[2][i - p_x[2]];
        } else {
            valid2[i] <== counter2[3][i - p_x[3]];
        }

        if (i < 6) {
            overflow2[i] <== counter2[3][i + (128 - 7)];
        }
    }

    // ===== Round 3: Process second-level overflows =====
    // Apply reduction polynomial to remaining overflow bits
    for (var pIdx = 0; pIdx < 4; pIdx++) {
        for (var over2Bit = 0; over2Bit < 6; over2Bit++) {
            if (pIdx == 0) {
                counter3[pIdx][over2Bit] <== overflow2[over2Bit];
            } else {
                var prevOver2Bit = over2Bit + (p_x[pIdx] - p_x[pIdx - 1]);
                if (prevOver2Bit < 6) {
                    counter3[pIdx][over2Bit] <== counter3[pIdx - 1][prevOver2Bit] + overflow2[over2Bit];
                } else {
                    counter3[pIdx][over2Bit] <== overflow2[over2Bit];
                }
            }
        }
    }
    
    // Extract final contributions from round 3 (only affects bits 0-12)
    for (var i = 0; i < 13; i++) {
        if (i < p_x[1]) {
            valid3[i] <== counter3[0][i - p_x[0]];
        } else if (i < p_x[2]) {
            valid3[i] <== counter3[1][i - p_x[1]];
        } else if (i < p_x[3]) {
            valid3[i] <== counter3[2][i - p_x[2]];
        } else {
            valid3[i] <== counter3[3][i - p_x[3]];
        }
    }

    // ===== Final step: Sum all contributions and reduce modulo 2 =====
    signal {bit} cBits[128];

    for (var cBit = 0; cBit < 128; cBit++) {
        if (cBit < 13) {
            cBits[cBit] <== Mod2()(valid1[cBit] + valid2[cBit] + valid3[cBit]);
        } else {
            cBits[cBit] <== Mod2()(valid1[cBit] + valid2[cBit]);
        }
    }
    
    // Convert final result bits back to bytes
    cBytes <== GF128BitsToBytes()(cBits);
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
    signal {byte} intermediateResults[numBlocks + 1][16];
    
    // Initialize with zeros
    for (var i = 0; i < 16; i++) {
        intermediateResults[0][i] <== 0;
    }
    
    // Process each 16-byte block
    component gf128Multiply[numBlocks];
    signal {byte} xorResult[numBlocks][16];
    for (var block = 0; block < numBlocks; block++) {
        // XOR current result with data block
        for (var i = 0; i < 16; i++) {
            xorResult[block][i] <== BitwiseXor(2,8)([intermediateResults[block][i],data[block * 16 + i]]);
        }
        
        // Multiply by hashKey in GF(2^128)
        intermediateResults[block + 1] <== GF128MultiplyOptimized()(xorResult[block],hashKey);
    }
    
    // Output final result
    result <== intermediateResults[numBlocks];
}