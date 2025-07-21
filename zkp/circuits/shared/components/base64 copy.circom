pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "range.circom";

/**
 * Converts ASCII characters to Base64 values with padding detection.
 * 
 * This template performs dual functions:
 * 1. Maps ASCII characters to their corresponding Base64 index values
 * 2. Detects if the input character is a padding symbol ('=')
 *
 * Base64 Mapping Table:
 * A-Z: 0-25   (ASCII 65-90)
 * a-z: 26-51  (ASCII 97-122)  
 * 0-9: 52-61  (ASCII 48-57)
 * +:   62     (ASCII 43)
 * /:   63     (ASCII 47)
 * =:   64     (ASCII 61, padding, output as 0 instead of 64 to avoid bit width issues)
 * 
 * Padding Handling:
 * When '=' is detected, isPadding outputs 1 and base64 outputs 0. This design
 * choice avoids the need for 7-bit output (which would be required for value 64)
 * and simplifies downstream processing.
 *
 * Example Usage:
 *   Input: 'A' (ASCII 65) -> Output: base64=0, isPadding=0
 *   Input: 'z' (ASCII 122) -> Output: base64=51, isPadding=0  
 *   Input: '9' (ASCII 57) -> Output: base64=61, isPadding=0
 *   Input: '=' (ASCII 61) -> Output: base64=0, isPadding=1
 */
template Base64CharWithPaddingDetector() {
    signal input {ascii} ascii;     // (7-bit, 0-127)
    signal output {base64} base64;  // (6-bit, 0-63)
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
    
    // Note: padding '=' contributes 0 to avoid needing 7-bit output width
    base64 <== upperValue + lowerValue + digitValue + plusValue + slashValue;
}

/**
 * Converts ASCII characters to Base64 values, strictly excluding padding characters.
 * 
 * Example Usage:
 *   Input: 'T' (ASCII 84) -> Output: base64=19
 *   Input: 'w' (ASCII 119) -> Output: base64=48  
 *   Input: '5' (ASCII 53) -> Output: base64=57
 *   Input: '+' (ASCII 43) -> Output: base64=62
 *   Input: '=' (ASCII 61) -> CONSTRAINT FAILURE (invalid input)
 */
template Base64CharValidator() {
    signal input {ascii} ascii;     // (7-bit, 0-127)
    signal output {base64} base64;  // (6-bit, 0-63)

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
 * Decodes a complete Base64 group (4 characters) into 3 bytes without padding support.
 * 
 * Example Walkthrough:
 * Input Base64 group: "TWFu" -> Base64 values: [19, 22, 5, 46]
 * 
 * Step 1 - Convert to 6-bit binary:
 *   19 -> 010011, 22 -> 010110, 5 -> 000101, 46 -> 101110
 * 
 * Step 2 - Concatenate: 010011010110000101101110 (24 bits)
 * 
 * Step 3 - Partition into bytes:
 *   Byte 1: 01001101 (bits 0-7)
 *   Byte 2: 01100001 (bits 8-15)  
 *   Byte 3: 01101110 (bits 16-23)
 * 
 * Step 4 - Convert to decimal: [77, 97, 110]
 *   In ASCII: 'M' + 'a' + 'n' = "Man"
 */
template Base64GroupDecoder() {
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
 * Decodes Base64 group (4 Base64 values) into 3 bytes with padding support.
 * This template handles the three possible padding scenarios in Base64:
 * 
 * 1. No padding ([0,0]): All 4 characters are valid Base64 -> decode to 3 bytes
 * 2. One padding ([0,1]): 3 valid + 1 padding char -> decode to 2 bytes  
 * 3. Two padding ([1,1]): 2 valid + 2 padding chars -> decode to 1 byte
 * 
 * The isPadding array indicates padding for the last two positions of the group:
 * - isPadding[0]: whether 3rd position is padding
 * - isPadding[1]: whether 4th position is padding
 * 
 * Example 1 - No padding ("TWFu" -> "Man"):
 *   base64Group: [19,22,5,46]
 *   isPadding: [0,0] 
 *   -> bytes: [77,97,110] (all 3 bytes valid)
 * 
 * Example 2 - One padding ("TWE=" -> "Ma"):
 *   base64Group: [19,22,4,0] (padding '=' converted to 0)
 *   isPadding: [0,1]
 *   -> bytes: [77,97,0] (first 2 bytes valid, last byte zeroed)
 * 
 * Example 3 - Two padding ("TQ==" -> "M"):  
 *   base64Group: [19,16,0,0] (padding '==' converted to 0,0)
 *   isPadding: [1,1]
 *   -> bytes: [77,0,0] (first byte valid, last 2 bytes zeroed)
 */
template Base64GroupDecoderWithPadding() {
    signal input {base64} base64Group[4];  // 4 Base64 values (0-64)
    signal input {bit} isPadding[2];       // [0,0], [0,1] or [1,1]
    signal output {byte} bytes[3];         // 3 decoded bytes (0-255)

    signal noPadding <== (1 - isPadding[0]) * (1 - isPadding[1]);
    signal onePadding <== (1 - isPadding[0]) * isPadding[1];
    signal twoPadding <== isPadding[0] * isPadding[1];

    signal validPadding <== noPadding + onePadding + twoPadding;
    validPadding === 1;

    signal rawBytes[3] <== Base64GroupDecoder()(base64Group);

    // Apply padding logic to determine valid output bytes
    bytes[0] <== rawBytes[0];
    bytes[1] <== rawBytes[1] * (1 - isPadding[0]);
    bytes[2] <== rawBytes[2] * (1 - isPadding[1]);
}

/**
 * Decodes a complete Base64 string by handling each 4-character group appropriately.
 * 
 * Key optimizations:
 * - Non-final groups use Base64GroupDecoder (no padding handling overhead)
 * - Final group uses Base64GroupDecoderWithPadding (handles potential padding)
 * 
 * Processing Logic:
 * 1. Divide input into 4-character groups
 * 2. For groups 1 to n-1: process as unpadded groups (3 bytes each)
 * 3. For final group: check for padding and handle accordingly
 * 4. Concatenate all decoded bytes into final output
 * 
 * Example: Decode "TWFueSBpcyB0aGlzIQ==" (Base64 for "Many is this!")
 *   - Input length: 20 chars -> 5 groups of 4
 *   - Groups 1-4: "TWFu", "eSBp", "cyB0", "aGlz" (no padding) -> 12 bytes
 *   - Group 5: "IQ==" (2 padding chars) -> 1 byte  
 *   - Total output: 13 bytes = [77,97,110,121,32,105,115,32,116,104,105,115,33]
 *   - ASCII conversion: "Many is this!"
 * 
 * @param inputLength - Total number of input ASCII characters (must be multiple of 4)
 */
template Base64Decoder(inputLength) {
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
                base64Group[i][j] <== Base64CharValidator()(asciis[i * 4 + j]);
            }
            bytesGroup[i] <== Base64GroupDecoder()(base64Group[i]);
        } else {
            for (var j = 0; j < 4; j++) {
                if (j < 2) {
                    base64Group[i][j] <== Base64CharValidator()(asciis[i * 4 + j]);
                } else {
                    (base64Group[i][j], isPadding[j - 2]) <== Base64CharWithPaddingDetector()(asciis[i * 4 + j]);
                }
            }
            bytesGroup[i] <== Base64GroupDecoderWithPadding()(base64Group[i], isPadding);
        }
        for (var j = 0; j < 3; j++) {
            var byteIndex = i * 3 + j;
            if (byteIndex < outputLength) {
                bytes[byteIndex] <== bytesGroup[i][j];
            }
        }
    }
}