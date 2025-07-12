pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/sha256/shift.circom";
include "circomlib/circuits/gates.circom";

/**
 * @param bits - The bit width of the input and mask
 * @param mask - The mask value to apply
 *
 * Example: Extract lower 4 bits using mask
 *  signal masked <== Mask(8,0x0F)(171); // Input:   10101011 (171)
 *                                       // Mask:    00001111  (15)
 *  masked === 11;                       // Result:  00001011  (11)  
 */
template Mask(bits, mask) {
    signal input in;
    signal output out;
    
    signal inBits[bits] <== Num2Bits(bits)(in);
    signal maskBits[bits] <== Num2Bits(bits)(mask);
    signal outBits[bits];

    for (var i = 0; i < bits; i++) {
        outBits[i] <== inBits[i]*maskBits[i];
    }

    out <== Bits2Num(bits)(outBits);
}

/**
 * @param bits - The bit width of the input number
 * @param offset - Number of positions to shift right
 * 
 * Example: Divide by 2^4 using right shift
 *  signal shifted <== ShiftRight(8,4)(171);  // Input: 10101011
 *  shifted === 10;                           // Result: 00001010
 */
template ShiftRight(bits, offset) {
    signal input in;
    signal output out;

    out <== Bits2Num(bits)(ShR(bits,offset)(Num2Bits(bits)(in)));
}


/**
 * @param bits - The bit width of the input numbers
 *
 * Example: XOR two 8-bit numbers
 *  signal result <== BitwiseXor(8)(170, 85);  // Input a: 10101010 (170)
*                                              // Input b: 01010101  (85)
 *  result === 255;                            // Result:  11111111 (255)
 */
template BitwiseXor(bits) {
    signal input a;
    signal input b;
    signal output c;
    
    signal aBits[bits] <== Num2Bits(bits)(a);
    signal bBits[bits] <== Num2Bits(bits)(b);
    signal cBits[bits];
    
    for (var i = 0; i < bits; i++) {
        cBits[i] <== XOR()(aBits[i], bBits[i]);
    }
    
    c <== Bits2Num(bits)(cBits);
}

/**
 * @param n - The number of input elements (only takes more than 2 inputs)
 * @param bits - The bit width of each input number
 *
 * Example: XOR three 8-bit numbers
 *  signal result <== MultiBitwiseXor(3, 8)([15, 51, 85]);  // Input a: 00001111  (15)
 *                                                          // Input b: 00110011  (51)
 *                                                          // Input c: 01010101  (85)
 *  result === 105;                                         // Result:  01101001 (105)
 */
template MultiBitwiseXor(n, bits) {
    assert (n >= 3); // If n == 2, use BitwiseXor instead.
    signal input in[n];
    signal output out;
    
    signal inBits[n][bits];
    for (var i = 0; i < n; i++) {
        inBits[i] <== Num2Bits(bits)(in[i]);
    }
    
    signal outBits[bits];
    signal tempXor[bits][n-1];
    for (var bitIdx = 0; bitIdx < bits; bitIdx++) {
        tempXor[bitIdx][0] <== XOR()(inBits[0][bitIdx], inBits[1][bitIdx]);
        for (var i = 2; i < n; i++) {
            tempXor[bitIdx][i-1] <== XOR()(tempXor[bitIdx][i-2], inBits[i][bitIdx]);
        }
        outBits[bitIdx] <== tempXor[bitIdx][n-2];
    }
    
    out <== Bits2Num(bits)(outBits);
}