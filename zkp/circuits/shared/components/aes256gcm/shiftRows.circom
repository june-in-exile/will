pragma circom 2.2.2;

/**
 * Column-major layout:
 * [ 0  4  8 12]  ->  [in[0]  in[4]  in[8]  in[12] ]
 * [ 1  5  9 13]  ->  [in[1]  in[5]  in[9]  in[13] ]
 * [ 2  6 10 14]  ->  [in[2]  in[6]  in[10] in[14] ]
 * [ 3  7 11 15]  ->  [in[3]  in[7]  in[11] in[15] ]
 */
template shiftRows() {
    signal input {byte} in[16];
    signal output {byte} out[16];

    // Row 0: No shift
    out[0] <== in[0];
    out[4] <== in[4];
    out[8] <== in[8];
    out[12] <== in[12];

    // Row 1: Left shift by 1 position
    out[1] <== in[5];
    out[5] <== in[9];
    out[9] <== in[13];
    out[13] <== in[1];

    // Row 2: Left shift by 2 positions
    out[2] <== in[10];
    out[6] <== in[14];
    out[10] <== in[2];
    out[14] <== in[6];

    // Row 3: Left shift by 3 positions
    out[3] <== in[15];
    out[7] <== in[3];
    out[11] <== in[7];
    out[15] <== in[11];
}