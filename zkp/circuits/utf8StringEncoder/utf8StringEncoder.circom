pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux2.circom";
include "../shared/components/utf8Encoder.circom";


template Utf8StringEncoder(length) {
    signal input {number} codepoints[length];
    signal output {byte} bytes[length * 4];
    signal output {number} totalBytes;
    
    signal utf32bytes[length][4], validBytes[length][4], byteCounts[length];

    (utf32bytes[0], validBytes[0]) <== Utf8Encoder(codepoints[i]);
    byteCounts[0] <== validBytes[0][0] + validBytes[0][1] + validBytes[0][2] + validBytes[0][3];

    for (var i = 1; i < length; i++) {
        (utf32bytes[i], validBytes[i]) <== Utf8Encoder(codepoints[i]);
        byteCounts[i] <== byteCounts[i-1] + validBytes[i][0] + validBytes[i][1] + validBytes[i][2] + validBytes[i][3];
    }
    totalBytes <== byteCounts[length-1];

    // handle the bytes
}




/**
 * UTF-8 String Encoder Template
 * 
 * This template encodes a string of Unicode codepoints into a UTF-8 byte sequence.
 * It handles variable-length strings up to maxChars characters and produces a 
 * contiguous byte array with proper byte ordering.
 * 
 * Features:
 * - Variable string length (up to maxChars)
 * - Proper byte packing without gaps
 * - Validation of string length and byte count
 * - Efficient constraint usage
 * 
 * @param maxChars - Maximum number of characters in the string
 * @param maxBytes - Maximum number of output bytes (should be >= maxChars * 4)
 */
template Utf8StringEncoder(maxChars, maxBytes) {
    // ========== INPUTS ==========
    signal input codepoints[maxChars];  // Unicode codepoints of the string
    signal input stringLength;          // Actual number of characters (0 to maxChars)
    
    // ========== OUTPUTS ==========
    signal output bytes[maxBytes];      // Packed UTF-8 byte sequence
    signal output totalBytes;           // Total number of valid bytes
    signal output valid;                // 1 if encoding is successful, 0 otherwise
    
    // ========== VALIDATION ==========
    // Ensure string length is within bounds
    component lengthCheck = LessThan(8);
    lengthCheck.in[0] <== stringLength;
    lengthCheck.in[1] <== maxChars + 1;  // stringLength <= maxChars
    
    // ========== CHARACTER ENCODING ==========
    // Encode each character individually
    component encoders[maxChars];
    for (var i = 0; i < maxChars; i++) {
        encoders[i] = Utf8Encoder();
        encoders[i].codepoint <== codepoints[i];
    }
    
    // ========== BYTE COUNT CALCULATION ==========
    // Calculate how many bytes each character produces
    signal charByteCount[maxChars];
    for (var i = 0; i < maxChars; i++) {
        charByteCount[i] <== encoders[i].validBytes[0] + 
                             encoders[i].validBytes[1] + 
                             encoders[i].validBytes[2] + 
                             encoders[i].validBytes[3];
    }
    
    // ========== CONDITIONAL BYTE COUNTING ==========
    // Only count bytes for characters within the string length
    component charValidChecks[maxChars];
    signal validCharByteCount[maxChars];
    
    for (var i = 0; i < maxChars; i++) {
        charValidChecks[i] = LessThan(8);
        charValidChecks[i].in[0] <== i;
        charValidChecks[i].in[1] <== stringLength;
        
        // Only count bytes if character index < stringLength
        validCharByteCount[i] <== charValidChecks[i].out * charByteCount[i];
    }
    
    // ========== TOTAL BYTE COUNT ==========
    // Sum all valid character byte counts
    component totalByteCalculator = ArraySum(maxChars);
    for (var i = 0; i < maxChars; i++) {
        totalByteCalculator.arr[i] <== validCharByteCount[i];
    }
    totalBytes <== totalByteCalculator.sum;
    
    // ========== BYTE OFFSET CALCULATION ==========
    // Calculate starting byte position for each character
    signal byteOffset[maxChars];
    byteOffset[0] <== 0;
    
    for (var i = 1; i < maxChars; i++) {
        byteOffset[i] <== byteOffset[i-1] + validCharByteCount[i-1];
    }
    
    // [1,0,0,0],[1,0,0,0],[1,1,0,0],[1,1,1,0],[1,1,0,0],[1,1,1,1]
    //  1         1         2         3         2         4
    //  0         4         8        11          
    

    // ========== BYTE PACKING ==========
    // Pack all character bytes into the output array
    component bytePacker = BytePacker(maxChars, maxBytes);
    
    // Connect character bytes and metadata
    for (var i = 0; i < maxChars; i++) {
        for (var j = 0; j < 4; j++) {
            bytePacker.charBytes[i][j] <== encoders[i].bytes[j];
            bytePacker.charValidBytes[i][j] <== encoders[i].validBytes[j];
        }
        bytePacker.charOffset[i] <== byteOffset[i];
        bytePacker.charIsValid[i] <== charValidChecks[i].out;
    }
    
    // Connect outputs
    for (var i = 0; i < maxBytes; i++) {
        bytes[i] <== bytePacker.packedBytes[i];
    }
    
    // ========== VALIDATION CHECK ==========
    // Ensure total bytes doesn't exceed maxBytes
    component bytesCheck = LessThan(16);
    bytesCheck.in[0] <== totalBytes;
    bytesCheck.in[1] <== maxBytes + 1;
    
    valid <== lengthCheck.out * bytesCheck.out;
}

/**
 * Array Sum Template
 * Helper template to calculate the sum of an array
 */
template ArraySum(n) {
    signal input arr[n];
    signal output sum;
    
    if (n == 1) {
        sum <== arr[0];
    } else {
        signal partial[n];
        partial[0] <== arr[0];
        
        for (var i = 1; i < n; i++) {
            partial[i] <== partial[i-1] + arr[i];
        }
        
        sum <== partial[n-1];
    }
}

/**
 * Byte Packer Template
 * Packs character bytes into a contiguous byte array
 */
template BytePacker(maxChars, maxBytes) {
    // ========== INPUTS ==========
    signal input charBytes[maxChars][4];      // Bytes for each character
    signal input charValidBytes[maxChars][4]; // Valid byte flags for each character
    signal input charOffset[maxChars];        // Starting byte offset for each character
    signal input charIsValid[maxChars];       // Whether each character should be included
    
    // ========== OUTPUTS ==========
    signal output packedBytes[maxBytes];      // Final packed byte array
    
    // ========== BYTE POSITION CALCULATION ==========
    // For each output byte position, determine which character byte it should contain
    component positionSelectors[maxBytes][maxChars][4];
    signal candidateBytes[maxBytes][maxChars][4];
    signal selectedBytes[maxBytes][maxChars];
    
    for (var bytePos = 0; bytePos < maxBytes; bytePos++) {
        for (var charIdx = 0; charIdx < maxChars; charIdx++) {
            for (var byteIdx = 0; byteIdx < 4; byteIdx++) {
                // Check if this byte position matches this character's byte
                positionSelectors[bytePos][charIdx][byteIdx] = IsEqual();
                positionSelectors[bytePos][charIdx][byteIdx].in[0] <== bytePos;
                positionSelectors[bytePos][charIdx][byteIdx].in[1] <== charOffset[charIdx] + byteIdx;
                
                // Select byte if position matches and byte is valid and character is valid
                candidateBytes[bytePos][charIdx][byteIdx] <== 
                    positionSelectors[bytePos][charIdx][byteIdx].out * 
                    charValidBytes[charIdx][byteIdx] * 
                    charIsValid[charIdx] * 
                    charBytes[charIdx][byteIdx];
            }
            
            // Sum all candidate bytes for this character at this position
            selectedBytes[bytePos][charIdx] <== 
                candidateBytes[bytePos][charIdx][0] + 
                candidateBytes[bytePos][charIdx][1] + 
                candidateBytes[bytePos][charIdx][2] + 
                candidateBytes[bytePos][charIdx][3];
        }
        
        // Sum contributions from all characters for this byte position
        component byteSummer = ArraySum(maxChars);
        for (var charIdx = 0; charIdx < maxChars; charIdx++) {
            byteSummer.arr[charIdx] <== selectedBytes[bytePos][charIdx];
        }
        packedBytes[bytePos] <== byteSummer.sum;
    }
}

/**
 * Optimized UTF-8 String Encoder (Alternative Implementation)
 * More efficient version for smaller strings
 */
template OptimizedUtf8StringEncoder(maxChars) {
    signal input codepoints[maxChars];
    signal input stringLength;
    signal output bytes[maxChars * 4];  // Maximum possible bytes
    signal output totalBytes;
    signal output valid;
    
    // Encode all characters
    component encoders[maxChars];
    for (var i = 0; i < maxChars; i++) {
        encoders[i] = Utf8Encoder();
        encoders[i].codepoint <== codepoints[i];
    }
    
    // Calculate valid character flags
    component charValidChecks[maxChars];
    signal charIsValid[maxChars];
    
    for (var i = 0; i < maxChars; i++) {
        charValidChecks[i] = LessThan(8);
        charValidChecks[i].in[0] <== i;
        charValidChecks[i].in[1] <== stringLength;
        charIsValid[i] <== charValidChecks[i].out;
    }
    
    // Pack bytes sequentially
    var byteIndex = 0;
    for (var charIdx = 0; charIdx < maxChars; charIdx++) {
        for (var byteIdx = 0; byteIdx < 4; byteIdx++) {
            bytes[byteIndex] <== encoders[charIdx].bytes[byteIdx] * 
                                encoders[charIdx].validBytes[byteIdx] * 
                                charIsValid[charIdx];
            byteIndex++;
        }
    }
    
    // Calculate total bytes
    signal charByteCounts[maxChars];
    for (var i = 0; i < maxChars; i++) {
        charByteCounts[i] <== charIsValid[i] * (
            encoders[i].validBytes[0] + 
            encoders[i].validBytes[1] + 
            encoders[i].validBytes[2] + 
            encoders[i].validBytes[3]
        );
    }
    
    component totalCalc = ArraySum(maxChars);
    for (var i = 0; i < maxChars; i++) {
        totalCalc.arr[i] <== charByteCounts[i];
    }
    totalBytes <== totalCalc.sum;
    
    // Validation
    component lengthCheck = LessThan(8);
    lengthCheck.in[0] <== stringLength;
    lengthCheck.in[1] <== maxChars + 1;
    valid <== lengthCheck.out;
}

// ========== USAGE EXAMPLES ==========

// Example 1: Small string encoder (up to 8 characters)
// component main = Utf8StringEncoder(8, 32);

// Example 2: Optimized version for short strings
// component main = OptimizedUtf8StringEncoder(4);

/*
 * Input Example (JSON):
 * {
 *   "codepoints": [72, 101, 108, 108, 111],  // "Hello"
 *   "stringLength": 5
 * }
 * 
 * Expected Output:
 * {
 *   "bytes": [72, 101, 108, 108, 111, 0, 0, ...],
 *   "totalBytes": 5,
 *   "valid": 1
 * }
 * 
 * Input Example with Multi-byte Characters:
 * {
 *   "codepoints": [20320, 22909, 0, 0],  // "你好" (Hello in Chinese)
 *   "stringLength": 2
 * }
 * 
 * Expected Output:
 * {
 *   "bytes": [228, 189, 160, 228, 184, 173, 0, 0, ...],
 *   "totalBytes": 6,
 *   "valid": 1
 * }
 */