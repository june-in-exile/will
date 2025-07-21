pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/sha256/shift.circom";
include "circomlib/circuits/bitify.circom";
include "range.circom";

/**
 * Base64 Mapping Table:
 * A-Z: 0-25   (ASCII 65-90)
 * a-z: 26-51  (ASCII 97-122)  
 * 0-9: 52-61  (ASCII 48-57)
 * +:   62     (ASCII 43)
 * /:   63     (ASCII 47)
 * =:   64     (ASCII 61, padding)
 */
template AsciiToBase64() {
    signal input {ascii} ascii;     // (0-127)
    signal output {base64} base64;  // (0-64)

    signal isUpperCase <== InRange(7)(ascii, 65, 90);    // A-Z
    signal isLowerCase <== InRange(7)(ascii, 97, 122);   // a-z
    signal isDigit <== InRange(7)(ascii, 48, 57);        // 0-9
    signal isPlus <== IsEqual()([ascii,43]);             // +
    signal isSlash <== IsEqual()([ascii,47]);            // /
    signal isPadding <== IsEqual()([ascii,61]);          // =

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
 * Converts ASCII characters to Base64 values, excluding padding characters.
 * This template only handles valid Base64 content characters (A-Z, a-z, 0-9, +, /)
 * and rejects padding symbols (=).
 */
template AsciiToBase64ExceptPadding() {
    signal input {ascii} ascii;     // (0-127)
    signal output {base64} base64;  // (0-64)

    signal isUpperCase <== InRange(7)(ascii, 65, 90);    // A-Z
    signal isLowerCase <== InRange(7)(ascii, 97, 122);   // a-z
    signal isDigit <== InRange(7)(ascii, 48, 57);        // 0-9
    signal isPlus <== IsEqual()([ascii,43]);             // +
    signal isSlash <== IsEqual()([ascii,47]);            // /

    1 === isUpperCase + isLowerCase + isDigit + isPlus + isSlash;
    
    signal upperValue <== isUpperCase * (ascii - 65);       // A=0, B=1, ..., Z=25
    signal lowerValue <== isLowerCase * (ascii - 97 + 26);  // a=26, b=27, ..., z=51
    signal digitValue <== isDigit * (ascii - 48 + 52);      // 0=52, 1=53, ..., 9=61
    signal plusValue <== isPlus * 62;                       // +=62
    signal slashValue <== isSlash * 63;                     // /=63
    
    base64 <== upperValue + lowerValue + digitValue + plusValue + slashValue;
}

/**
 * Converts ASCII characters to Base64 values and indicates if the character is padding.
 * This template handles all valid Base64 characters including padding (=),
 * but outputs padding as 0 instead of 64 to avoid bit width issues.
 *
 * The isPadding output signal indicates whether the character was a padding symbol.
 */
template AsciiToBase64IsPadding() {
    signal input {ascii} ascii;     // (0-127)
    signal output {base64} base64;  // (0-64)
    signal output {bit} isPadding;  // 1 if input was padding (=), 0 otherwise

    signal isUpperCase <== InRange(7)(ascii, 65, 90);    // A-Z
    signal isLowerCase <== InRange(7)(ascii, 97, 122);   // a-z
    signal isDigit <== InRange(7)(ascii, 48, 57);        // 0-9
    signal isPlus <== IsEqual()([ascii,43]);             // +
    signal isSlash <== IsEqual()([ascii,47]);            // /
    isPadding <== IsEqual()([ascii,61]);                 // =

    1 === isUpperCase + isLowerCase + isDigit + isPlus + isSlash + isPadding;
    
    signal upperValue <== isUpperCase * (ascii - 65);       // A=0, B=1, ..., Z=25
    signal lowerValue <== isLowerCase * (ascii - 97 + 26);  // a=26, b=27, ..., z=51
    signal digitValue <== isDigit * (ascii - 48 + 52);      // 0=52, 1=53, ..., 9=61
    signal plusValue <== isPlus * 62;                       // +=62
    signal slashValue <== isSlash * 63;                     // /=63
    
    // Note: = should be 64, but use 0 to avoid extra bit width
    // and use isPadding signal to determine if it was padding
    base64 <== upperValue + lowerValue + digitValue + plusValue + slashValue;
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
    signal input {base64} base64Group[4];  // 4 Base64 values (0-64)
    signal output {byte} bytes[3];         // 3 decoded bytes (0-255)
    
    // Handle padding cases
    signal isPadding[4];
    for (var i = 0; i < 4; i++) {
        isPadding[i] <== IsEqual()([base64Group[i],64]); // 64 is padding value
    }
    
    // Ensure padding can only appear at the end
    signal firstTwoNotPadding <== (1 - isPadding[0]) * (1 - isPadding[1]);
    signal lastTwoNotPadding <== (1 - isPadding[2]) * (1 - isPadding[3]);
    signal lastOneIsPadding <== (1 - isPadding[2]) * isPadding[3];
    signal lastTwoArePadding <== isPadding[2] * isPadding[3];

    signal hasNoPadding <== firstTwoNotPadding * lastTwoNotPadding;
    signal hasOnePadding <== firstTwoNotPadding * lastOneIsPadding;
    signal hasTwoPadding <== firstTwoNotPadding * lastTwoArePadding;

    signal validPadding <== hasNoPadding + hasOnePadding + hasTwoPadding;
    validPadding === 1;
    
    // Extract effective values (treat padding as 0)
    signal effectiveBase64Group[4];
    for (var i = 0; i < 4; i++) {
        effectiveBase64Group[i] <== base64Group[i] * (1 - isPadding[i]);
    }
    
    // Ensure all valid values are in 0-63 range
    signal validValue[4];
    for (var i = 0; i < 4; i++) {
        validValue[i] <== LessEqThan(6)([effectiveBase64Group[i],63]);
        validValue[i] === 1;
    }
    
    // Bit shift and mask operations
    // values[0] << 2
    signal first_base64_left_2 <== effectiveBase64Group[0] * 0x04;

    // values[1] >> 4
    signal socond_base64_bits[6] <== Num2Bits(6)(effectiveBase64Group[1]);
    signal socond_base64_right_4_bits[6] <== ShR(6,4)(socond_base64_bits);
    signal socond_base64_right_4 <== Bits2Num(6)(socond_base64_right_4_bits);

    // (values[1] & 15) << 4
    signal socond_base64_and_15_bits[6];
    for (var i = 0; i < 4; i++) {
        socond_base64_and_15_bits[i] <== socond_base64_bits[i];
    }
    for (var i = 4; i < 6; i++) {
        socond_base64_and_15_bits[i] <== 0;
    }
    signal socond_base64_and_15 <== Bits2Num(6)(socond_base64_and_15_bits);
    signal socond_base64_masked_left_4 <== socond_base64_and_15 * 0x10;
    
    // values[2] >> 2
    signal third_base64_bits[6] <== Num2Bits(6)(effectiveBase64Group[2]);
    signal third_base64_right_2_bits[6] <== ShR(6,2)(third_base64_bits);
    signal third_base64_right_2 <== Bits2Num(6)(third_base64_right_2_bits);
    
    // (values[2] & 3) << 6
    signal third_base64_and_3_bits[6];
    for (var i = 0; i < 2; i++) {
        third_base64_and_3_bits[i] <== third_base64_bits[i];
    }
    for (var i = 2; i < 6; i++) {
        third_base64_and_3_bits[i] <== 0;
    }
    signal third_base64_and_3 <== Bits2Num(6)(third_base64_and_3_bits);
    signal third_base64_masked_left_6 <== third_base64_and_3 * 0x40;

    // values[3]
    signal fourth_base64 <== effectiveBase64Group[3];

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
 * Handles only base64 group without padding symbols.
 *
 * Besides, this template is also an optimized version that uses a more direct bit manipulation approach
 * compared to the original, converting Base64 values to bits, rearranging them, and then extracting bytes.
 */
template UnpaddedBase64GroupDecoder() {
    signal input {base64} base64Group[4];  // 4 Base64 values (0-64)
    signal output {byte} bytes[3];         // 3 decoded bytes (0-255)

    // Convert each 6-bit base64 value to binary representation
    signal base64GroupBits[4][6];
    signal bits[24];
    for (var i = 0; i < 4; i++) {
        base64GroupBits[i] <== Num2Bits(6)(base64Group[i]);
        for (var j = 0; j < 6; j++) {
            bits[i * 6 + j] <== base64GroupBits[i][5 - j];
        }
    }

    // Extract 3 bytes from the 24-bit sequence
    signal byteBits[3][8];
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 8; j++) {
            byteBits[i][7 - j] <== bits[i * 8 + j];
        }
        bytes[i] <== Bits2Num(8)(byteBits[i]);
    }
}

/**
 * Handles only base64 group with valid padding pattern ([0,0], [0,1] or [1,1]).
 * 
 * Besides, this template is also an optimized version that uses a more direct bit manipulation approach
 * compared to the original, converting Base64 values to bits, rearranging them, and then extracting bytes.
 */
template PaddedBase64GroupDecoder() {
    signal input {base64} base64Group[4];  // 4 Base64 values (0-64)
    signal input {bit} isPadding[2];       // [0,0], [0,1] or [1,1]
    signal output {byte} bytes[3];         // 3 decoded bytes (0-255)

    signal noPadding <== (1 - isPadding[0]) * (1 - isPadding[1]);
    signal onePadding <== (1 - isPadding[0]) * isPadding[1];
    signal twoPadding <== isPadding[0] * isPadding[1];

    signal validPadding <== noPadding + onePadding + twoPadding;
    validPadding === 1;

    signal rawBytes[3] <== UnpaddedBase64GroupDecoder()(base64Group);

    // Apply padding logic to determine valid output bytes
    bytes[0] <== rawBytes[0];
    bytes[1] <== rawBytes[1] * (1 - isPadding[0]);
    bytes[2] <== rawBytes[2] * (1 - isPadding[1]);
}

/**
 * Decode 4 Base64 characters into 3 bytes
 * 
 * Example: Decode "TWFu" (Base64 for "Man")
 *  ASCII code of "TWFu" ([84,87,70,117]) -> AsciiToBase64() -> Base64 Value of "TWFu" ([19,22,5,46])
 *      -> Base64GroupDecoder() -> [77,97,110] (decoded bytes, in this case it's ASCII code of "Man")
 *
 *  signal {ascii} ascii_TWFu[4] <== [84, 87, 70, 117];
 *  signal bytes[3] <== Base64Decoder(4)(ascii_TWFu);
 *  bytes === [77, 97, 110]; // (ASCII for "Man")
 */
template Base64Decoder(inputLength) {
    assert(inputLength % 4 == 0);
    var groups = inputLength \ 4;
    var outputLength = groups * 3;

    signal input {ascii} asciis[inputLength];  // ASCII values of base64 characters (0-127)
    signal output {byte} bytes[outputLength];  // Decoded bytes (0-255)

    signal {base64} base64Group[groups][4];
    signal {byte} bytesGroup[groups][3];
    
    for (var i = 0; i < groups; i++) {
        for (var j = 0; j < 4; j++) {
            base64Group[i][j] <== AsciiToBase64()(asciis[i * 4 + j]);
        }
        bytesGroup[i] <== Base64GroupDecoder()(base64Group[i]);
        for (var j = 0; j < 3; j++) {
            var byteIndex = i * 3 + j;
            if (byteIndex < outputLength) {
                bytes[byteIndex] <== bytesGroup[i][j];
            }
        }
    }
}

/**
 * Optimized Base64 decoder that processes multiple 4-character groups efficiently.
 * This template uses specialized sub-templates for better performance:
 * - Non-final groups use UnpaddedBase64GroupDecoder (no padding handling needed)
 * - Final group uses PaddedBase64GroupDecoder (handles potential padding)
 * 
 * The optimization reduces circuit complexity by avoiding padding checks for
 * groups that cannot contain padding (all groups except the last one).
 */
 template Base64DecoderOptimized(inputLength) {
    assert(inputLength % 4 == 0);
    var groups = inputLength \ 4;
    var outputLength = groups * 3;

    signal input {ascii} asciis[inputLength];  // ASCII values of base64 characters (0-127)
    signal output {byte} bytes[outputLength];  // Decoded bytes (0-255)

    signal {base64} base64Group[groups][4];
    signal {byte} bytesGroup[groups][3];
    signal {bit} isPadding[2];
    
    for (var i = 0; i < groups; i++) {
        if (i < groups - 1) {
            for (var j = 0; j < 4; j++) {
                base64Group[i][j] <== AsciiToBase64ExceptPadding()(asciis[i * 4 + j]);
            }
            bytesGroup[i] <== UnpaddedBase64GroupDecoder()(base64Group[i]);
        } else {
            for (var j = 0; j < 4; j++) {
                if (j < 2) {
                    base64Group[i][j] <== AsciiToBase64ExceptPadding()(asciis[i * 4 + j]);
                } else {
                    (base64Group[i][j], isPadding[j - 2]) <== AsciiToBase64IsPadding()(asciis[i * 4 + j]);
                }
            }
            bytesGroup[i] <== PaddedBase64GroupDecoder()(base64Group[i], isPadding);
        }
        for (var j = 0; j < 3; j++) {
            var byteIndex = i * 3 + j;
            if (byteIndex < outputLength) {
                bytes[byteIndex] <== bytesGroup[i][j];
            }
        }
    }
}