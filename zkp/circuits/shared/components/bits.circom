pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/sha256/shift.circom";

/**
 * @param bits - The bit width of the input and mask
 * @param mask - The mask value to apply
 *
 * Example: Extract lower 4 bits using mask
 *  signal {number} masked <== Mask(8,15)(171); // Input:   10101011 (171)
 *                                      // Mask:    00001111  (15)
 *  masked === 11;                      // Result:  00001011  (11)  
 */
template Mask(bits, mask) {
    signal input {number} in;
    signal output {number} out;
    
    signal in_bits[bits] <== Num2Bits(bits)(in);
    signal mask_bits[bits] <== Num2Bits(bits)(mask);
    signal out_bits[bits];

    for (var i = 0; i < bits; i++) {
        out_bits[i] <== in_bits[i]*mask_bits[i];
    }

    out <== Bits2Num(bits)(out_bits);
}

/**
 * @param bits - The bit width of the input number
 * @param offset - Number of positions to shift right
 * 
 * Example: Divide by 2^4 using right shift
 *  signal {number} shifted = ShiftRight(8,4)(171);  // Input: 10101011
 *  shifted === 10;                         // Result: 00001010
 */
template ShiftRight(bits, offset) {
    signal input {number} in;
    signal output {number} out;

    signal in_bits[bits] <== Num2Bits(bits)(in);
    signal out_bits[bits] <== ShR(bits,offset)(in_bits);
    out <== Bits2Num(bits)(out_bits);
}