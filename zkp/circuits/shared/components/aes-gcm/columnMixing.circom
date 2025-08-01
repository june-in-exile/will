pragma circom 2.2.2;

include "galoisField.circom";
include "../bits.circom";

/** 
 * Input:
 *   [s0, s1, s2, s3]
 *
 * Process:
 *   [2 3 1 1]   [s0,
 *   [1 2 3 1] * ,s1,
 *   [1 1 2 3]   ,s2,
 *   [3 1 1 2]   ,s3]
 *
 * Output:
 *   [2*s0 ⊕ 3*s1 ⊕ s2 ⊕ s3,
 *   ,s0 ⊕ 2*s1 ⊕ 3*s2 ⊕ s3,
 *   ,s0 ⊕ s1 ⊕ 2*s2 ⊕ 3*s3,
 *   ,3*s0 ⊕ s1 ⊕ s2 ⊕ 2*s3]
 * 
 * Where ⊕ represents XOR and multiplications are in GF(2^8).
 */
template MixColumn() {
    signal input {byte} in[4];
    signal output {byte} out[4];
    
    signal (s0_mul2, s0_mul3) <== (GF8Mul2()(in[0]), GF8Mul3()(in[0]));
    signal (s1_mul2, s1_mul3) <== (GF8Mul2()(in[1]), GF8Mul3()(in[1]));
    signal (s2_mul2, s2_mul3) <== (GF8Mul2()(in[2]), GF8Mul3()(in[2]));
    signal (s3_mul2, s3_mul3) <== (GF8Mul2()(in[3]), GF8Mul3()(in[3]));

    out[0] <== BitwiseXorOptimized(4, 8)([s0_mul2, s1_mul3, in[2], in[3]]);
    out[1] <== BitwiseXorOptimized(4, 8)([in[0], s1_mul2, s2_mul3, in[3]]);
    out[2] <== BitwiseXorOptimized(4, 8)([in[0], in[1], s2_mul2, s3_mul3]);
    out[3] <== BitwiseXorOptimized(4, 8)([s0_mul3, in[1], in[2], s3_mul2]);
}

/**
 * The 16-byte state is stored in column-major order.
 */
template MixColumns() {
    signal input {byte} in[16];
    signal output {byte} out[16];

    signal {byte} inCols[4][4];
    signal {byte} outCols[4][4];

    for (var c = 0; c < 4; c++) {
        for (var r = 0; r < 4; r++) {
            inCols[c][r] <== in[4 * c + r];
        }
        outCols[c] <== MixColumn()(inCols[c]);
        for (var r = 0; r < 4; r++) {
            out[4 * c + r] <== outCols[c][r];
        }
    }
}