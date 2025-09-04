pragma circom 2.2.2;

include "keccak256-circom/circuits/keccak.circom";

template VocdoniKeccak256(nBitsIn) {
    signal input msg[nBitsIn];
    signal output digest[nBitsOut];

    digest <== Keccak(nBitsIn, 256)(msg);
}
