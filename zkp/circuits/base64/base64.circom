/*
 * Base64 Decoding Circuit Implementation
 * Contains AsciiToBase64 and Base64GroupDecoder core templates
 */

pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "../shared/components/asciiToBase64.circom";
include "../shared/components/range.circom";
include "../shared/components/mod.circom";

// =============================================================================
// Base64 Group Decoder (4 characters -> 3 bytes)
// =============================================================================

/**
 * Decode 4 Base64 values into 3 bytes
 * 
 * Example: values = [19, 22, 5, 46] (TWVu -> "Men")
 * byte1 = (19 << 2) | (22 >> 4) = 76 + 1 = 77 ('M')
 * byte2 = ((22 & 15) << 4) | (5 >> 2) = 96 + 1 = 97 ('e') 
 * byte3 = ((5 & 3) << 6) | 46 = 64 + 46 = 110 ('n')
 */
template Base64GroupDecoder() {
    signal input values[4];   // 4 Base64 values (0-64)
    signal output bytes[3];   // 3 decoded bytes (0-255)
    
    // Handle padding cases - declare all components outside loops
    component paddingCheck[4];
    signal isPadding[4];
    for (var i = 0; i < 4; i++) {
        paddingCheck[i] = IsEqual();
    }
    
    for (var i = 0; i < 4; i++) {
        paddingCheck[i].in[0] <== values[i];
        paddingCheck[i].in[1] <== 64;  // padding value
        isPadding[i] <== paddingCheck[i].out;
    }
    
    // Ensure padding can only appear at the end
    // If there's padding, it must be consecutive trailing characters
    signal hasNoPadding;
    signal hasOnePadding;
    signal hasTwoPadding;
    
    signal temp1 <== (1 - isPadding[0]) * (1 - isPadding[1]);
    signal temp2 <== (1 - isPadding[2]) * (1 - isPadding[3]);
    hasNoPadding <== temp1 * temp2;

    signal temp3 <== (1 - isPadding[2]) * isPadding[3];
    hasOnePadding <== temp1 * temp3;

    signal temp4 <== isPadding[2] * isPadding[3];
    hasTwoPadding <== temp1 * temp4;
    
    signal validPadding;
    validPadding <== hasNoPadding + hasOnePadding + hasTwoPadding;
    validPadding === 1;
    
    // Extract effective values (treat padding as 0)
    signal effectiveValues[4];
    for (var i = 0; i < 4; i++) {
        effectiveValues[i] <== values[i] * (1 - isPadding[i]);
    }
    
    // Ensure all valid values are in 0-63 range - declare components outside loop
    component valueCheck[4];
    for (var i = 0; i < 4; i++) {
        valueCheck[i] = LessEqThan(6);
    }
    
    for (var i = 0; i < 4; i++) {
        valueCheck[i].in[0] <== effectiveValues[i];
        valueCheck[i].in[1] <== 63;
        valueCheck[i].out === 1;
    }
    
    // Base64 decoding calculation
    // Each Base64 character represents 6 bits
    // 4 characters = 24 bits = 3 bytes
    
    // Calculate bit shifts and mask operations
    signal value0_shifted_left_2;    // values[0] << 2
    signal value1_shifted_right_4;   // values[1] >> 4
    signal value1_masked_left_4;     // (values[1] & 15) << 4
    signal value2_shifted_right_2;   // values[2] >> 2
    signal value2_masked_left_6;     // (values[2] & 3) << 6
    
    // Bit shift operations (implemented with multiplication and division in ZK circuits)
    value0_shifted_left_2 <== effectiveValues[0] * 4;        // << 2
    value1_shifted_right_4 <== effectiveValues[1] / 16;      // >> 4
    
    // Calculate mask (values[1] & 15)
    signal value1_mod_16;
    component mod16 = Modulo(6, 4);  // 6-bit input, modulo 16
    mod16.in <== effectiveValues[1];
    value1_mod_16 <== mod16.out;
    value1_masked_left_4 <== value1_mod_16 * 16;  // << 4
    
    value2_shifted_right_2 <== effectiveValues[2] / 4;       // >> 2
    
    // Calculate mask (values[2] & 3)
    signal value2_mod_4;
    component mod4 = Modulo(6, 2);   // 6-bit input, modulo 4
    mod4.in <== effectiveValues[2];
    value2_mod_4 <== mod4.out;
    value2_masked_left_6 <== value2_mod_4 * 64;  // << 6
    
    // Combine into final bytes
    signal rawBytes[3];
    rawBytes[0] <== value0_shifted_left_2 + value1_shifted_right_4;
    rawBytes[1] <== value1_masked_left_4 + value2_shifted_right_2;
    rawBytes[2] <== value2_masked_left_6 + effectiveValues[3];
    
    // Adjust output based on padding cases
    // 1 padding: only 2 valid bytes
    // 2 padding: only 1 valid byte
    signal finalBytes[3];
    finalBytes[0] <== rawBytes[0];  // First byte is always valid
    finalBytes[1] <== rawBytes[1] * (1 - hasTwoPadding);  // 0 when two padding
    finalBytes[2] <== rawBytes[2] * hasNoPadding;         // Only valid when no padding
    
    // Ensure byte values are in correct range - declare components outside loop
    component byteCheck[3];
    for (var i = 0; i < 3; i++) {
        byteCheck[i] = LessEqThan(8);
    }
    
    for (var i = 0; i < 3; i++) {
        byteCheck[i].in[0] <== finalBytes[i];
        byteCheck[i].in[1] <== 255;
        byteCheck[i].out === 1;
        
        bytes[i] <== finalBytes[i];
    }
}

/**
 * Test Base64 decoding functionality
 * Uses known test vectors for verification
 */
template TestBase64Decoder() {
    // Test "TWFu" -> "Man"
    // T=19, W=22, F=5, u=46
    // Expected output: M=77, a=97, n=110
    
    signal input testChars[4];    // [84, 87, 70, 117] - ASCII for "TWFu"
    signal output testBytes[3];   // Expected [77, 97, 110]
    
    // Character to value conversion - declare components outside loop
    component charToValue[4];
    for (var i = 0; i < 4; i++) {
        charToValue[i] = AsciiToBase64();
    }
    
    for (var i = 0; i < 4; i++) {
        charToValue[i].asciiCode <== testChars[i];
    }
    
    // Group decoding
    component groupDecoder = Base64GroupDecoder();
    for (var i = 0; i < 4; i++) {
        groupDecoder.values[i] <== charToValue[i].base64Value;
    }
    
    for (var i = 0; i < 3; i++) {
        testBytes[i] <== groupDecoder.bytes[i];
        log(testBytes[i]);
    }
}

/**
 * Complete Base64 decoder (supports multiple groups)
 * This is the version for future integration into main circuit
 */
template Base64Decoder(inputLength, outputLength) {
    signal input base64Chars[inputLength];  // ASCII values of base64 characters
    signal output bytes[outputLength];      // Decoded bytes
    
    // Ensure input length is multiple of 4 (after padding)
    assert(inputLength % 4 == 0);
    
    var groups = inputLength \ 4;
    
    // Character to value conversion - declare components outside loop
    component charToValue[inputLength];
    for (var i = 0; i < inputLength; i++) {
        charToValue[i] = AsciiToBase64();
    }
    
    for (var i = 0; i < inputLength; i++) {
        charToValue[i].asciiCode <== base64Chars[i];
    }
    
    // Group decoding - declare components outside loop
    component groupDecoder[groups];
    for (var i = 0; i < groups; i++) {
        groupDecoder[i] = Base64GroupDecoder();
    }
    
    for (var i = 0; i < groups; i++) {
        for (var j = 0; j < 4; j++) {
            groupDecoder[i].values[j] <== charToValue[i * 4 + j].base64Value;
        }
        
        // Output bytes (handle possible padding in last group)
        for (var j = 0; j < 3; j++) {
            var byteIndex = i * 3 + j;
            if (byteIndex < outputLength) {
                bytes[byteIndex] <== groupDecoder[i].bytes[j];
            }
        }
    }
}

component main = TestBase64Decoder();