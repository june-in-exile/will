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
    
    signal s0_mul2 <== GFMul2()(in[0]);
    signal s0_mul3 <== GFMul3()(in[0]);
    signal s1_mul2 <== GFMul2()(in[1]);
    signal s1_mul3 <== GFMul3()(in[1]);
    signal s2_mul2 <== GFMul2()(in[2]);
    signal s2_mul3 <== GFMul3()(in[2]);
    signal s3_mul2 <== GFMul2()(in[3]);
    signal s3_mul3 <== GFMul3()(in[3]);

    out[0] <== BitwiseXor(4,8)([s0_mul2,s1_mul3,in[2],in[3]]);
    out[1] <== BitwiseXor(4,8)([in[0],s1_mul2,s2_mul3,in[3]]);
    out[2] <== BitwiseXor(4,8)([in[0],in[1],s2_mul2,s3_mul3]);
    out[3] <== BitwiseXor(4,8)([s0_mul3,in[1],in[2],s3_mul2]);
}

/**
 * The 16-byte state is stored in column-major order.
 */
template MixColumns() {
    signal input {byte} in[16];
    signal output {byte} out[16];

    component col0 = MixColumn();
    col0.in[0] <== in[0];
    col0.in[1] <== in[1];
    col0.in[2] <== in[2];
    col0.in[3] <== in[3];
    out[0] <== col0.out[0];
    out[1] <== col0.out[1]; 
    out[2] <== col0.out[2];
    out[3] <== col0.out[3];

    component col1 = MixColumn();
    col1.in[0] <== in[4];
    col1.in[1] <== in[5];
    col1.in[2] <== in[6];
    col1.in[3] <== in[7];
    out[4] <== col1.out[0];
    out[5] <== col1.out[1];
    out[6] <== col1.out[2];
    out[7] <== col1.out[3];

    component col2 = MixColumn();
    col2.in[0] <== in[8];
    col2.in[1] <== in[9];
    col2.in[2] <== in[10];
    col2.in[3] <== in[11];
    out[8] <== col2.out[0];
    out[9] <== col2.out[1];
    out[10] <== col2.out[2];
    out[11] <== col2.out[3];

    component col3 = MixColumn();
    col3.in[0] <== in[12];
    col3.in[1] <== in[13];
    col3.in[2] <== in[14];
    col3.in[3] <== in[15];
    out[12] <== col3.out[0];
    out[13] <== col3.out[1];
    out[14] <== col3.out[2];
    out[15] <== col3.out[3];
}
