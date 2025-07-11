pragma circom 2.2.2;

template shiftRows() {
    signal input {byte} in[4][4];
    signal output {byte} out[4][4];

    for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
            out[r][c] = in[r][(c+r)%4];
        }
    }
}