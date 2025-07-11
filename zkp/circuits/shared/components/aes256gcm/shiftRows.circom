pragma circom 2.2.2;

template shiftRows() {
    signal input {byte} in[16];
    signal output {byte} out[16];

    out[0] <== in[0]; out[4] <== in[4];
    out[8] <== in[8]; out[12] <== in[12];

    out[1] <== in[5]; out[5] <== in[9];
    out[9] <== in[13]; out[13] <== in[1];

    out[2] <== in[10]; out[6] <== in[14];
    out[10] <== in[2]; out[14] <== in[6];

    out[3] <== in[15]; out[7] <== in[3];
    out[11] <== in[7]; out[15] <== in[11];
}