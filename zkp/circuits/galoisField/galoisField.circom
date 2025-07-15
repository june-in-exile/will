pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "../shared/components/arithmetic.circom";
include "../shared/components/bits.circom";

/**
 * Galois Field multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros in LSB order)
 *
 * Algorithm:
 * c = Σ (a[i] == 1 ? b << i : 0) mod p(x)
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
    signal carry[128];
    
    for (var byte = 0; byte < 16; byte++) {
        aBitGroup[byte] <== Num2Bits(8)(aBytes[byte]);
        bBitGroup[byte] <== Num2Bits(8)(bBytes[byte]);
        for (var bit = 0; bit < 8; bit++) {
            aBits[byte * 8 + bit] <== aBitGroup[byte][7 - bit];
            bBits[0][byte * 8 + bit] <== bBitGroup[byte][7 - bit];
            cBits[0][byte * 8 + bit] <== 0;
        }
    }
    
    for (var round = 1; round < 129; round++) {
        carry[round - 1] <== bBits[round - 1][127];
        for (var bit = 0; bit < 128; bit++) {
            cBits[round][bit] <== cBits[round - 1][bit] + aBits[round - 1] * bBits[round - 1][bit];
            if (bit == 0) {
                bBits[round][bit] <== carry[round - 1];
            } else if (bit == 1 || bit == 2 || bit == 7) {
                bBits[round][bit] <== XOR()(carry[round - 1], bBits[round - 1][bit - 1]);
            } else {
                bBits[round][bit] <== bBits[round - 1][bit - 1];
            }
        }
    }

    // Convert final result to bytes (LSB first order)
    for (var byte = 0; byte < 16; byte++) {
        for (var bit = 0; bit < 8; bit++) {
            cBitGroup[byte][7 - bit] <== cBits[128][byte * 8 + bit];
        }
        cBytes[byte] <== Bits2Num(8)(cBitGroup[byte]);
    }
}

// component main = GF128Multiply();

// Auto updated: 2025-07-15T02:40:06.782Z
template UntaggedGF128Multiply() {
    signal input aBytes[16];
    signal input bBytes[16];
    signal output {byte,lsb} cBytes[16];

    signal {byte,lsb} _aBytes[16];
    _aBytes <== aBytes;
    signal {byte,lsb} _bBytes[16];
    _bBytes <== bBytes;

    cBytes <== GF128Multiply()(_aBytes, _bBytes);
}

component main = UntaggedGF128Multiply();
