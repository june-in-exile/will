pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "asciiToBase64.circom";

/**
 * Decode 4 Base64 values into 3 bytes
 * 
 * Example: values = [19,22,5,46] (TWVu -> "Men")
 * byte1 = (19 << 2) | (22 >> 4) = 76 + 1 = 77 ('M')
 * byte2 = ((22 & 15) << 4) | (5 >> 2) = 96 + 1 = 97 ('e') 
 * byte3 = ((5 & 3) << 6) | 46 = 64 + 46 = 110 ('n')
 */
template Base64GroupDecoder() {
    signal input values[4];   // 4 Base64 values (0-64)
    signal output bytes[3];   // 3 decoded bytes (0-255)
    
    // Handle padding cases
    signal isPadding[4];
    for (var i = 0; i < 4; i++) {
        isPadding[i] <== IsEqual()([values[i],64]); // 64 is padding value
    }
    
    // Ensure padding can only appear at the end
    // If there's padding,it must be consecutive trailing characters
    signal hasNoPadding;
    signal hasOnePadding;
    signal hasTwoPadding;
    
    signal firstTwoNotPadding <== (1 - isPadding[0]) * (1 - isPadding[1]);
    signal LastTwoNotPadding <== (1 - isPadding[2]) * (1 - isPadding[3]);
    signal LastOneIsPadding <== (1 - isPadding[2]) * isPadding[3];
    signal LastTwoArePadding <== isPadding[2] * isPadding[3];

    hasNoPadding <== firstTwoNotPadding * LastTwoNotPadding;
    hasOnePadding <== firstTwoNotPadding * LastOneIsPadding;
    hasTwoPadding <== firstTwoNotPadding * LastTwoArePadding;

    signal validPadding;
    validPadding <== hasNoPadding + hasOnePadding + hasTwoPadding;
    validPadding === 1;
    
    // Extract effective values (treat padding as 0)
    signal effectiveValues[4];
    for (var i = 0; i < 4; i++) {
        effectiveValues[i] <== values[i] * (1 - isPadding[i]);
    }
    
    // Ensure all valid values are in 0-63 range
    signal validValue[4];
    for (var i = 0; i < 4; i++) {
        validValue[i] <== LessEqThan(6)([effectiveValues[i],63]);
        validValue[i] === 1;
    }
    
    // Bit shift and mask operations
    signal value0_shifted_left_2 <== effectiveValues[0] * 4;    // values[0] << 2

    signal value1_shifted_right_4 <-- effectiveValues[1] >> 4;  // values[1] >> 4

    signal value1_and_15 <-- effectiveValues[1] & 15;           // values[1] & 15
    signal value1_masked_left_4 <== value1_and_15 * 16;         // (values[1] & 15) << 4
    
    signal value2_shifted_right_2 <-- effectiveValues[2] \ 4;   // values[2] >> 2
    
    signal value2_and_3 <-- effectiveValues[2] & 3;             // values[2] & 3
    signal value2_masked_left_6 <== value2_and_3 * 64;          // (values[2] & 3) << 6

    // Combine into final bytes
    signal rawBytes[3];
    rawBytes[0] <== value0_shifted_left_2 + value1_shifted_right_4;
    rawBytes[1] <== value1_masked_left_4 + value2_shifted_right_2;
    rawBytes[2] <== value2_masked_left_6 + effectiveValues[3];
    
    // Adjust output based on padding cases
    bytes[0] <== rawBytes[0];                       // First byte is always valid
    bytes[1] <== rawBytes[1] * (1 - hasTwoPadding); // 0 when two padding
    bytes[2] <== rawBytes[2] * hasNoPadding;        // Only valid when no padding
    
    // Ensure byte values are in correct range
    signal validByte[3];
    for (var i = 0; i < 3; i++) {
        validByte[i] <== LessEqThan(8)([bytes[i],255]);
        validByte[i] === 1;
    }
}