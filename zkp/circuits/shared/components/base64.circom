pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/sha256/shift.circom";
include "circomlib/circuits/bitify.circom";
include "arithmetic.circom";
include "range.circom";

/**
 * Base64 Mapping Table：
 * A-Z: 0-25   (ASCII 65-90)
 * a-z: 26-51  (ASCII 97-122)  
 * 0-9: 52-61  (ASCII 48-57)
 * +:   62     (ASCII 43)
 * /:   63     (ASCII 47)
 * =:   64     (ASCII 61, padding)
 */
template AsciiToBase64() {
    signal input ascii;     // (0-127)
    signal output base64;   // (0-64)
    
    signal {bool} isUpperCase <== InRange(7)(ascii, 65, 90);    // A-Z
    signal {bool} isLowerCase <== InRange(7)(ascii, 97, 122);   // a-z
    signal {bool} isDigit <== InRange(7)(ascii, 48, 57);        // 0-9
    signal {bool} isPlus <== IsEqual()([ascii,43]);             // +
    signal {bool} isSlash <== IsEqual()([ascii,47]);            // /
    signal {bool} isPadding <== IsEqual()([ascii,61]);          // =

    1 === isUpperCase + isLowerCase + isDigit + isPlus + isSlash + isPadding;
    
    signal upperValue <== isUpperCase * (ascii - 65);       // A=0, B=1, ..., Z=25
    signal lowerValue <== isLowerCase * (ascii - 97 + 26);  // a=26, b=27, ..., z=51
    signal digitValue <== isDigit * (ascii - 48 + 52);      // 0=52, 1=53, ..., 9=61
    signal plusValue <== isPlus * 62;                       // +=62
    signal slashValue <== isSlash * 63;                     // /=63
    signal paddingValue <== isPadding * 64;                 // ==64
    
    base64 <== upperValue + lowerValue + digitValue + plusValue + slashValue + paddingValue;
}

/**
 * Decode 4 Base64 values into 3 bytes
 * 
 * Example: base64 values = [19,22,5,46] ("TWFu" -> "Man")
 * byte1 = (19 << 2) | (22 >> 4) = 76 + 1 = 77 ('M')
 * byte2 = ((22 & 15) << 4) | (5 >> 2) = 96 + 1 = 97 ('a') 
 * byte3 = ((5 & 3) << 6) | 46 = 64 + 46 = 110 ('n')
 */
template Base64GroupDecoder() {
    signal input base64s[4];    // 4 Base64 values (0-64)
    signal output bytes[3];     // 3 decoded bytes (0-255)
    
    // Handle padding cases
    signal {bool} isPadding[4];
    for (var i = 0; i < 4; i++) {
        isPadding[i] <== IsEqual()([base64s[i],64]); // 64 is padding value
    }
    
    // Ensure padding can only appear at the end
    signal {bool} firstTwoNotPadding <== (1 - isPadding[0]) * (1 - isPadding[1]);
    signal {bool} lastTwoNotPadding <== (1 - isPadding[2]) * (1 - isPadding[3]);
    signal {bool} lastOneIsPadding <== (1 - isPadding[2]) * isPadding[3];
    signal {bool} lastTwoArePadding <== isPadding[2] * isPadding[3];

    signal {bool} hasNoPadding <== firstTwoNotPadding * lastTwoNotPadding;
    signal {bool} hasOnePadding <== firstTwoNotPadding * lastOneIsPadding;
    signal {bool} hasTwoPadding <== firstTwoNotPadding * lastTwoArePadding;

    signal {bool} validPadding <== hasNoPadding + hasOnePadding + hasTwoPadding;
    validPadding === 1;
    
    // Extract effective values (treat padding as 0)
    signal effectiveBase64s[4];
    for (var i = 0; i < 4; i++) {
        effectiveBase64s[i] <== base64s[i] * (1 - isPadding[i]);
    }
    
    // Ensure all valid values are in 0-63 range
    signal {bool} validValue[4];
    for (var i = 0; i < 4; i++) {
        validValue[i] <== LessEqThan(6)([effectiveBase64s[i],63]);
        validValue[i] === 1;
    }
    
    // Bit shift and mask operations
    // values[0] << 2
    signal first_base64_left_2 <== effectiveBase64s[0] * 4;

    // values[1] >> 4
    signal {bits6} socond_base64_bits[6] <== Num2Bits(6)(effectiveBase64s[1]);
    signal {bits6} socond_base64_right_4_bits[6] <== ShR(6,4)(socond_base64_bits);
    signal socond_base64_right_4 <== Bits2Num(6)(socond_base64_right_4_bits);

    // (values[1] & 15) << 4
    signal {bits6} socond_base64_and_15_bits[6];
    for (var i = 0; i < 4; i++) {
        socond_base64_and_15_bits[i] <== socond_base64_bits[i];
    }
    for (var i = 4; i < 6; i++) {
        socond_base64_and_15_bits[i] <== 0;
    }
    signal socond_base64_and_15 <== Bits2Num(6)(socond_base64_and_15_bits);
    signal socond_base64_masked_left_4 <== socond_base64_and_15 * 16;         
    
    // values[2] >> 2
    signal {bits6} third_base64_bits[6] <== Num2Bits(6)(effectiveBase64s[2]);
    signal {bits6} third_base64_right_2_bits[6] <== ShR(6,2)(third_base64_bits);
    signal third_base64_right_2 <== Bits2Num(6)(third_base64_right_2_bits);
    
    // (values[2] & 3) << 6
    signal {bits6} third_base64_and_3_bits[6];
    for (var i = 0; i < 2; i++) {
        third_base64_and_3_bits[i] <== third_base64_bits[i];
    }
    for (var i = 2; i < 6; i++) {
        third_base64_and_3_bits[i] <== 0;
    }
    signal third_base64_and_3 <== Bits2Num(6)(third_base64_and_3_bits);
    signal third_base64_masked_left_6 <== third_base64_and_3 * 64;  

    // values[3]
    signal fourth_base64 <== effectiveBase64s[3];

    // Combine into final bytes
    signal rawBytes[3];
    rawBytes[0] <== first_base64_left_2 + socond_base64_right_4;
    rawBytes[1] <== socond_base64_masked_left_4 + third_base64_right_2;
    rawBytes[2] <== third_base64_masked_left_6 + fourth_base64;
    
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

/**
 * Decode 4 Base64 characters into 3 bytes
 * 
 * Example: ASCII code of "TWFu" ([84,87,86,117]) -> AsciiToBase64() -> [19,22,5,46]
 *  -> Base64GroupDecoder() -> [77,97,110] (decoded bytes, in this case it's ASCII code of "Man")
 */
template Base64Decoder(inputLength) {
    assert(inputLength % 4 == 0);
    var groups = inputLength \ 4;
    var outputLength = groups * 3;

    signal input asciis[inputLength];   // ASCII values of base64 characters (0-127)
    signal output bytes[outputLength];  // Decoded bytes (0-255)
    
    // Character to value conversion
    component asciiToBase64[inputLength];
    for (var i = 0; i < inputLength; i++) {
        asciiToBase64[i] = AsciiToBase64();
    }
    
    for (var i = 0; i < inputLength; i++) {
        asciiToBase64[i].ascii <== asciis[i];
    }
    
    component groupDecoder[groups];
    for (var i = 0; i < groups; i++) {
        groupDecoder[i] = Base64GroupDecoder();
    }
    
    for (var i = 0; i < groups; i++) {
        for (var j = 0; j < 4; j++) {
            groupDecoder[i].base64s[j] <== asciiToBase64[i * 4 + j].base64;
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