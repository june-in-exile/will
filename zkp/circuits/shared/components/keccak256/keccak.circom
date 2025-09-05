pragma circom 2.2.2;

include "../../../node_modules/keccak256-circom/circuits/keccak.circom";

template Keccak(nBitsIn, nBitsOut) {

    signal input msg[nBitsIn];
    signal output digest[nBitsOut];

    out <== Keccak(nBitsIn, nBitsOut)(msg);
}
