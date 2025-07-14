pragma circom 2.2.2;

include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/bitify.circom";
include "../shared/components/arithmetic.circom";
include "../shared/components/bits.circom";

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
        aBitGroup[byte] <== Num2Bits(8)(aBytes[byte]);
    }
    // a <== aBytes[0] * 2**15 + aBytes[1] * 2**14 + aBytes[2] * 2**13 + aBytes[3] * 2**12 + aBytes[4] * 2**11 + aBytes[5] * 2**10 + aBytes[6] * 2**9 + aBytes[7] * 2**8
    //         + aBytes[8] * 2**7 + aBytes[9] * 2**6 + aBytes[10] * 2**5 + aBytes[11] * 2**4 + aBytes[12] * 2**3 + aBytes[13] * 2**2 + aBytes[14] * 2**1 + aBytes[15] * 2**0;
    b[0] <== bBytes[0] * 2**15 + bBytes[1] * 2**14 + bBytes[2] * 2**13 + bBytes[3] * 2**12 + bBytes[4] * 2**11 + bBytes[5] * 2**10 + bBytes[6] * 2**9 + bBytes[7] * 2**8
            + bBytes[8] * 2**7 + bBytes[9] * 2**6 + bBytes[10] * 2**5 + bBytes[11] * 2**4 + bBytes[12] * 2**3 + bBytes[13] * 2**2 + bBytes[14] * 2**1 + bBytes[15] * 2**0;
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
        log(cBytes[byte]);
    }
}

// component main = Multiply();

// Auto updated: 2025-07-14T23:01:29.554Z
template UntaggedGF128Multiply() {
    signal input aBytes[16];
    signal input bBytes[16];
    signal output {byte} cBytes[16];

    signal {byte} _aBytes[16];
    _aBytes <== aBytes;
    signal {byte} _bBytes[16];
    _bBytes <== bBytes;

    cBytes <== GF128Multiply()(_aBytes, _bBytes);
}

component main = UntaggedGF128Multiply();
