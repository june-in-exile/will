pragma circom 2.2.2;

/**
 * The 16-byte state is stored in column-major order.
 */
template ShiftRows() {
    signal input {byte} in[16];
    signal output {byte} out[16];

    (out[0],out[4],out[8],out[12])  <== (in[0],in[4],in[8],in[12]);
    (out[1],out[5],out[9],out[13])  <== (in[5],in[9],in[13],in[1]);
    (out[2],out[6],out[10],out[14]) <== (in[10],in[14],in[2],in[6]);
    (out[3],out[7],out[11],out[15]) <== (in[15],in[3],in[7],in[11]);
}