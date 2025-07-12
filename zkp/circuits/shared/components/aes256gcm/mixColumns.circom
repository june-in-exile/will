pragma circom 2.2.2;

include "galoisField.circom";
include "../bits.circom";

/**
 * MixColumns transformation for a single column (4 bytes)
 * 
 * This implements the MixColumns step of AES, which treats each column
 * of the state as a polynomial and multiplies it by the fixed polynomial
 * c(x) = 3x³ + x² + x + 2 in GF(2^8).
 * 
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

    // Row 0: [2 3 1 1] * [s0 s1 s2 s3]ᵀ = 2*s0 ⊕ 3*s1 ⊕ s2 ⊕ s3
    signal temp0_1 <== s0_mul2 ^ s1_mul3;
    signal temp0_2 <== temp0_1 ^ in[2];
    out[0] <== temp0_2 ^ in[3];
    
    // Row 1: [1 2 3 1] * [s0 s1 s2 s3]ᵀ = s0 ⊕ 2*s1 ⊕ 3*s2 ⊕ s3
    signal temp1_1 <== in[0] ^ s1_mul2;
    signal temp1_2 <== temp1_1 ^ s2_mul3;
    out[1] <== temp1_2 ^ in[3];
    
    // Row 2: [1 1 2 3] * [s0 s1 s2 s3]ᵀ = s0 ⊕ s1 ⊕ 2*s2 ⊕ 3*s3
    signal temp2_1 <== in[0] ^ in[1];
    signal temp2_2 <== temp2_1 ^ s2_mul2;
    out[2] <== temp2_2 ^ s3_mul3;
    
    // Row 3: [3 1 1 2] * [s0 s1 s2 s3]ᵀ = 3*s0 ⊕ s1 ⊕ s2 ⊕ 2*s3
    signal temp3_1 <== s0_mul3 ^ in[1];
    signal temp3_2 <== temp3_1 ^ in[2];
    out[3] <== temp3_2 ^ s3_mul2;
}

/**
 * MixColumns transformation for the entire 16-byte state
 * The 16-byte state is stored in column-major order.
 */
template MixColumns() {
    signal input {byte} in[16];
    signal output {byte} out[16];
    
    signal col0_out[4] <== MixColumn()([in[0], in[1], in[2], in[3]]);
    out[0] <== col0_out[0];
    out[1] <== col0_out[1]; 
    out[2] <== col0_out[2];
    out[3] <== col0_out[3];
    
    signal col1_out[4] <== MixColumn()([in[4], in[5], in[6], in[7]]);
    out[4] <== col1_out[0];
    out[5] <== col1_out[1];
    out[6] <== col1_out[2];
    out[7] <== col1_out[3];
    
    signal col2_out[4] <== MixColumn()([in[8], in[9], in[10], in[11]]);
    out[8] <== col2_out[0];
    out[9] <== col2_out[1];
    out[10] <== col2_out[2];
    out[11] <== col2_out[3];
    
    signal col3_out[4] <== MixColumn()([in[12], in[13], in[14], in[15]]);
    out[12] <== col3_out[0];
    out[13] <== col3_out[1];
    out[14] <== col3_out[2];
    out[15] <== col3_out[3];
}