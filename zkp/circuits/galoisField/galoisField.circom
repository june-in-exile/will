pragma circom 2.2.2;

include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/bitify.circom";
include "../shared/components/arithmetic.circom";
include "../shared/components/bits.circom";

/**
 * Galois Field multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros)
 *
 * Algorithm:
 * c = Σ (a[i] == 1 ? b << i : 0) mod p(x)
 */
template GF128Multiply() {
    signal input {byte,lsb} aBytes[16];
    signal input {byte,lsb} bBytes[16];
    signal output {byte,lsb} cBytes[16];
    
    // Convert 16-byte a, b to 128-bit (LSB first order), initialize v = b, c = 0
    signal aBitGroup[16][8];
    signal {bit} aBits[128];
    signal b[129];
    signal c[130];
    
    for (var byte = 0; byte < 16; byte++) {
        aBitGroup[byte] <== Num2Bits(8)(aBytes[byte]);
        for (var bit = 0; bit < 8; bit++) {
            aBits[byte * 8 + bit] <== aBitGroup[byte][7 - bit];
        }
    }
    // a <== aBytes[0] * 2**15 + aBytes[1] * 2**14 + aBytes[2] * 2**13 + aBytes[3] * 2**12 + aBytes[4] * 2**11 + aBytes[5] * 2**10 + aBytes[6] * 2**9 + aBytes[7] * 2**8
    //         + aBytes[8] * 2**7 + aBytes[9] * 2**6 + aBytes[10] * 2**5 + aBytes[11] * 2**4 + aBytes[12] * 2**3 + aBytes[13] * 2**2 + aBytes[14] * 2**1 + aBytes[15] * 2**0;
    b[0] <== bBytes[0] * 2**120 + bBytes[1] * 2**112 + bBytes[2] * 2**104 + bBytes[3] * 2**96 + bBytes[4] * 2**88 + bBytes[5] * 2**80 + bBytes[6] * 2**72 + bBytes[7] * 2**64
            + bBytes[8] * 2**56 + bBytes[9] * 2**48 + bBytes[10] * 2**40 + bBytes[11] * 2*32 + bBytes[12] * 2**24 + bBytes[13] * 2**16 + bBytes[14] * 2**8 + bBytes[15] * 2**0;
    c[0] <== 0;

    // p(x) = x^128 + x^7 + x^2 + x + 1
    var p = 2**128 + 2**7 + 2**2 + 2**1 + 2**0;
    
    // Process each bit of a
    for (var round = 1; round < 129; round++) {
        var byte = (round - 1) \ 8, bit = (round - 1) % 8;
        log("aBits[", round - 1, "]:", aBits[round - 1]);

        // Step 1: If a[round], c += b
        c[round] <== c[round - 1] + aBits[round - 1] * b[round - 1];
        
        // Step 2: b *= 2 mod p(x)
        (_, b[round]) <== Divide(129, 129)(b[round - 1] * 2, p);
    }

    // c %= p(x)
    (_, c[129]) <== Divide(135, 129)(c[128], p);
    log("c[129]:", c[129]);
    
    // Convert final result to bytes with modulo 2
    signal cBits[128] <== Num2Bits(128)(c[129]);
    signal cBitGroup[16][8];
    for (var byte = 0; byte < 16; byte++) {
        for (var bit = 0; bit < 8; bit++) {
            cBitGroup[byte][bit] <== cBits[byte * 8 + bit];
            log("cBits[", byte * 8 + bit, "]:", cBits[byte * 8 + bit]);
        }
        cBytes[byte] <== Bits2Num(8)(cBitGroup[byte]);
    }
}

// component main = Multiply();

// Auto updated: 2025-07-15T01:25:36.101Z
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
