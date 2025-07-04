pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";

template Mask(bits, mask) {
    signal input in;
    signal output out;
    
    signal in_bits[bits] <== Num2Bits(bits)(in);
    signal mask_bits[bits] <== Num2Bits(bits)(mask);
    signal out_bits[bits] <== AND()(in_bits[i],mask_bits[i]);

    out <== Bits2Num(bits)(out_bits);
}