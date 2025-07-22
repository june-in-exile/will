pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "../arithmetic.circom";
include "../bits.circom";

/**
 * @param in - Input 16-byte array representing a counter value
 * @param out - Output 16-byte array with incremented counter value
 * 
 * Increments a 16-byte counter by 1, treating the last 4 bytes as a 32-bit
 * little-endian counter while preserving the first 12 bytes unchanged.
 * 
 * Example: Increment a counter where last 4 bytes represent the count
 *  signal result[16] <== IncrementCounter()([0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255]);
 *  result[0..11] === [0,0,0,0,0,0,0,0,0,0,0,0];  // First 12 bytes unchanged
 *  result[12..15] === [0,0,0,0];                  // Counter rolled over: 0xFFFFFFFF + 1 = 0x00000000
 */
template IncrementCounter() {
    signal input {byte} in[16];
    signal output {byte} out[16];
    
    for (var i = 0; i < 12; i++) {
        out[i] <== in[i];
    }

    signal {byte} zero <== 0x00;

    signal {bit} carry[5];
    carry[0] <== 1;
    
    for (var i = 0; i < 4; i++) {
        (out[15 - i], carry[i + 1]) <== ByteAdder()(in[15 - i], zero, carry[i]);
    }
}

/**
 * Optimized version that uses direct arithmetic operations instead of cascaded byte adders for better efficiency.
 */
template IncrementCounterOptimized() {
    signal input {byte} in[16];
    signal output {byte} out[16];
    
    for (var i = 0; i < 12; i++) {
        out[i] <== in[i];
    }

    signal counter <== in[12] * 2**24 + in[13] * 2**16 + in[14] * 2**8 + in[15];

    signal bits[33] <== Num2Bits(33)(counter + 1);
    signal bitGroup[4][8];

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 8; j++) {
            bitGroup[i][j] <== bits[i * 8 + j];
        }
        out[15 - i] <== Bits2Num(8)(bitGroup[i]);
    }
}

