pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/sha256/shift.circom";
include "circomlib/circuits/gates.circom";
include "arithmetic.circom";

/**
* @param in - The input number to check parity for
* @return out - The result: 0 if even, 1 if odd
* 
* Example:
*  signal parity <== Mod2()(7);   // Returns 1 (odd)
*  signal parity <== Mod2()(8);   // Returns 0 (even)
*/
template Mod2() {
    signal input in;
    signal output {bit} out;
    
    signal quotient;
    
    (quotient, out) <== Divide()(in, 2);
    
    out * (out - 1) === 0;
}

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
 * @param n - The number of input elements
 * @param bits - The bit width of each input number
 *
 * Example: XOR two 8-bit numbers (i.e., Galois Field addition in GF(2^8))
 *  signal result <== BitwiseXor(2, 8)([170, 85]);  // Input a: 10101010 (170)
 *                                                  // Input b: 01010101  (85)
 *  result === 255;                                 // Result:  11111111 (255)
 *
 * Example: XOR three 8-bit numbers
 *  signal result <== BitwiseXor(3, 8)([15, 51, 85]);  // Input a: 00001111  (15)
 *                                                     // Input b: 00110011  (51)
 *                                                     // Input c: 01010101  (85)
 *  result === 105;                                    // Result:  01101001 (105)
 */
template BitwiseXor(n, bits) {
    assert (n >= 2);
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

/**
 * Optimized version that uses modulo arithmetic instead of chained XOR gates for better efficiency
 *
 * Note: The optimization advantage is most significant when n > 2, as it reduces the number of
 * intermediate constraints compared to chained XOR operations
 */
template BitwiseXorOptimized(n, bits) {
    assert (n > 2);
    signal input in[n];
    signal output out;
    
    signal inBits[n][bits];
    for (var i = 0; i < n; i++) {
        inBits[i] <== Num2Bits(bits)(in[i]);
    }
    
    signal outBits[bits];
    for (var bitIdx = 0; bitIdx < bits; bitIdx++) {
        var tempSum = inBits[0][bitIdx] + inBits[1][bitIdx];
        for (var i = 2; i < n; i++) {
            tempSum += inBits[i][bitIdx];
        }
        outBits[bitIdx] <== Mod2()(tempSum);
    }
    
    out <== Bits2Num(bits)(outBits);
}

/**
 * @param a - First 8-bit input operand
 * @param b - Second 8-bit input operand  
 * @param carry_in - Input carry bit from previous addition
 * @param c - 8-bit sum output (a + b + carry_in) mod 256
 * @param carry_out - Output carry bit (1 if sum >= 256, 0 otherwise)
 * 
 * Example: Add two bytes with carry
 *  signal result, carry <== ByteAdder()(200, 100, 1);  // Input: 200 + 100 + 1 = 301
 *  result === 45;                                      // Result: 301 - 256 = 45
 *  carry === 1;                                        // Carry: 301 >= 256, so carry = 1
 */
template ByteAdder() {
    signal input {byte} a;
    signal input {byte} b;
    signal input {bit} carry_in;
    signal output {byte} c;
    signal output {bit} carry_out;

    signal sum <== a + b + carry_in;

    carry_out <== GreaterEqThan(9)([sum,256]);
    c <== sum - carry_out * 256;    

    _ = Num2Bits(8)(a);
    _ = Num2Bits(8)(b);
    _ = Num2Bits(8)(c);
}

/**
 * Bit Array Mapping:
 * - bits[0] = x^0 coefficient → bytes[0] bit 7
 * - bits[1] = x^1 coefficient → bytes[0] bit 6
 * - ...
 * - bits[7] = x^7 coefficient → bytes[0] bit 0
 * - bits[8] = x^8 coefficient → bytes[1] bit 7
 * - ...
 * - bits[127] = x^127 coefficient → bytes[15] bit 0
 * 
 * Example:
 * - Input bytes[0] = 0x80 (10000000₂) → bits[0-7] = [1,0,0,0,0,0,0,0]
 * - Input bytes[0] = 0x01 (00000001₂) → bits[0-7] = [0,0,0,0,0,0,0,1]
 */
template Byte16ToBit128() {
    signal input {byte} bytes[16];
    signal output {bit} bits[128];
    
    component byteToBits[16];
    
    for (var byteIdx = 0; byteIdx < 16; byteIdx++) {
        byteToBits[byteIdx] = Num2Bits(8);
        byteToBits[byteIdx].in <== bytes[byteIdx];
        
        for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
            bits[byteIdx * 8 + bitIdx] <== byteToBits[byteIdx].out[7 - bitIdx];
        }
    }
}

/**
 * Bit Array Mapping:
 * - bits[0] = x^0 coefficient → bytes[0] bit 7
 * - bits[1] = x^1 coefficient → bytes[0] bit 6
 * - ...
 * - bits[7] = x^7 coefficient → bytes[0] bit 0
 * - bits[8] = x^8 coefficient → bytes[1] bit 7
 * - ...
 * - bits[127] = x^127 coefficient → bytes[15] bit 0
 * 
 * Example:
 * - Input bits[0-7] = [1,0,0,0,0,0,0,0] → bytes[0] = 0x80 (10000000₂)
 * - Input bits[0-7] = [0,0,0,0,0,0,0,1] → bytes[0] = 0x01 (00000001₂)
 */
template Bit128ToByte16() {
    signal input {bit} bits[128];
    signal output {byte} bytes[16];
    
    component bitsToBytes[16];
    
    for (var byteIdx = 0; byteIdx < 16; byteIdx++) {
        bitsToBytes[byteIdx] = Bits2Num(8);
        
        for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
            bitsToBytes[byteIdx].in[7 - bitIdx] <== bits[byteIdx * 8 + bitIdx];
        }
        
        bytes[byteIdx] <== bitsToBytes[byteIdx].out;
    }
}

/**
 * Convert an array of 16 bytes to a single 128-bit number
 * 
 * Example:
 * - Input: [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
 * - Output: 1 (big-endian interpretation)
 *
 * - Input: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]
 * - Output: 2^127 (big-endian interpretation)
 */
template Byte16ToNum() {
    signal input {byte} in[16];
    signal output out;

    signal byteBits[16][8];
    signal bits[128];
    for (var byte = 0; byte < 16; byte++) {
        byteBits[byte] <== Num2Bits(8)(in[byte]);
        for (var bit = 0; bit < 8; bit++) {
            bits[byte * 8 + bit] <== byteBits[byte][7 - bit];
        }
    }

    out <== Bits2Num(128)(bits);
}

/**
 * Convert a 128-bit number to an array of 16 bytes
 * 
 * Example:
 * - Input: 1
 * - Output: [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
 *
 * - Input: 2^127
 * - Output: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]
 */
template NumToByte16() {
    signal input in;
    signal output {byte} out[16];

    signal bits[128] <== Num2Bits(128)(in);
    signal byteBits[16][8];

    for (var byte = 0; byte < 16; byte++) {
        for (var bit = 0; bit < 8; bit++) {
            byteBits[byte][7 - bit] <== bits[byte * 8 + bit];
        }
        out[byte] <== Bits2Num(8)(byteBits[byte]);
    }
}

/**
 * N-bit left rotation
 * @param bits - Number of bits (64 for Keccak lanes)
 * @param positions - Number of positions to rotate left
 */
template RotateLeft(bits, positions) {
    signal input in;
    signal output out;

    signal (rightPart, leftPart) <== Divide()(in * 2 ** positions, 2 ** bits);

    out <== leftPart + rightPart;
}