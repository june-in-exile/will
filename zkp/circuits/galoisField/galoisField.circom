pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "../shared/components/arithmetic.circom";
include "../shared/components/bits.circom";


    idx:    0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
      a:    1  0  0  1  0  0  0  1
      b:    1  1  1  0  1  1  1  1
   p(x):    1  1  0  1  1

   aBit:    0:7
   bBit:    0:7

   ctr1:    1  1  1  0  1  1  1  1  0  0  0  0  0  0  0
            1  1  1  0  1  1  1  1  0  0  0  0  0  0  0
            1  1  1  0  1  1  1  1  0  0  0  0  0  0  0
            1  1  1  1  2  2  1  2  1  1  1  0  0  0  0
            1  1  1  1  2  2  1  2  1  1  1  0  0  0  0
            1  1  1  1  2  2  1  2  1  1  1  0  0  0  0
            1  1  1  1  2  2  1  2  1  1  1  0  0  0  0
            1  1  1  1  2  2  1  3  2  2  1  1  1  1  1
            valid1                , over1

   p(x):    1  1  0  1  1
  over1:    2  2  1  1  1  1  1

   pBit:    0:4
overBit:    0:6

   ctr2:    2  2  1  1  1  1  1  0  0  0  0
            2  4  3  2  2  2  2  1  0  0  0
            2  4  3  2  2  2  2  1  0  0  0
            2  4  3  4  4  3  3  2  1  1  0
            2  4  3  4  6  5  4  3  2  2  1
            valid2                , over2
  
   p(x):    1  1  0  1  1
  over2:    2  2  1

   pBit:    0:4
overBit:    0:2

   ctr3:    2  2  1  0  0  0  0
            2  4  3  1  0  0  0
            2  4  3  1  0  0  0
            2  4  3  3  2  1  0
            2  4  3  3  4  3  1
            valid3

       c
= valid1    1  1  1  1  2  2  1  3
+ valid2    2  4  3  4  6  5  4  3
+ valid3    2  4  3  3  4  3  1
=           5  9  7  8 12 10  6  6       

   mod2:    1  1  1  0  0  0  0  0

/**
 * Galois Field multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros in LSB order)
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
    
    signal aBitGroup[16][8];
    signal bBitGroup[16][8];
    signal cBitGroup[16][8];
    signal aBits[128];
    signal bBits[128];
    signal cBits[128];
    
    // Convert 16-byte a, b to 128-bit, initialize c = 0
    for (var byte = 0; byte < 16; byte++) {
        // in-byte: MSB first -> LSB first
        aBitGroup[byte] <== Num2Bits(8)(aBytes[byte]);
        bBitGroup[byte] <== Num2Bits(8)(bBytes[byte]);
        // between-byte: LSB first -> MSB first
        for (var bit = 0; bit < 8; bit++) {
            aBits[byte * 8 + bit] <== aBitGroup[byte][7 - bit];
            bBits[byte * 8 + bit] <== bBitGroup[byte][7 - bit];
        }
    }

    signal counter1[129][255]; // First round: overflow to bit 128 + 128 - 1 = 255
    signal counter2[129][255]; // Second round: overflow to bit 127 + 8 - 1 = 134
    signal counter3[129][255]; // Third round: overflow to bit 6 + 8 - 1 = 15
127 + 
    
    0127

    
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
    for (var byte = 0; byte < 16; byte++) {
        // between-byte: MSB first -> LSB first
        for (var bit = 0; bit < 8; bit++) {
            cBitGroup[byte][7 - bit] <== cBits[128][byte * 8 + bit];
        }
        // in-byte: LSB first -> MSB first
        cBytes[byte] <== Bits2Num(8)(cBitGroup[byte]);
    }
}
