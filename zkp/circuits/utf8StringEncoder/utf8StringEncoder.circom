pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "../shared/components/utf8Encoder.circom";

/**
 * @param length - Fixed number of characters to encode
 * 
 * Input:
 * - codepoints[length] - Array of Unicode codepoints to encode
 * 
 * Output: 
 * - bytes[length * 4] - Packed UTF-8 byte sequence (max 4 bytes per char)
 * - totalBytes - Total number of valid bytes in the output
 * 
 * Example:
 * Input:  codepoints = [65, 20013, 128640]  // "A中🚀"
 * Output: bytes = [65, 228, 184, 173, 240, 159, 154, 128, 0, 0, 0, 0]
 *         totalBytes = 8
 */
template Utf8StringEncoder(length) {
    signal input {number} codepoints[length];
    signal output {byte} bytes[length * 4];
    signal output {number} totalBytes;
    
    // ========== CHARACTER ENCODING ==========
    signal utf32Bytes[length][4], validBytes[length][4], cumulativeByteCounts[length];

    (utf32Bytes[0], validBytes[0]) <== Utf8Encoder()(codepoints[0]);
    cumulativeByteCounts[0] <== validBytes[0][0] + validBytes[0][1] + validBytes[0][2] + validBytes[0][3];

    for (var i = 1; i < length; i++) {
        (utf32Bytes[i], validBytes[i]) <== Utf8Encoder()(codepoints[i]);
        cumulativeByteCounts[i] <== cumulativeByteCounts[i-1] + validBytes[i][0] + validBytes[i][1] + validBytes[i][2] + validBytes[i][3];
    }
    
    totalBytes <== cumulativeByteCounts[length-1];

    // ========== BYTE PACKING ==========
    signal byteOffsets[length]; // The starting byte offset for each character
 
    byteOffsets[0] <== 0;
    
    for (var i = 1; i < length; i++) {
        byteOffsets[i] <== cumulativeByteCounts[i-1];
    }
    
    // ========== SEQUENTIAL BYTE PLACEMENT ==========
    // For each output byte position, determine which character byte it should contain
    component byteSelectors[length * 4][length][4];
    signal selectedBytes[length * 4][length][4];
    signal characterContributions[length * 4][length];
    
    for (var outPos = 0; outPos < length * 4; outPos++) {
        for (var charIdx = 0; charIdx < length; charIdx++) {
            for (var byteIdx = 0; byteIdx < 4; byteIdx++) {
                // Check if this output position matches this character's byte position
                byteSelectors[outPos][charIdx][byteIdx] = IsEqual();
                byteSelectors[outPos][charIdx][byteIdx].in[0] <== outPos;
                byteSelectors[outPos][charIdx][byteIdx].in[1] <== byteOffsets[charIdx] + byteIdx;
                
                // Select the byte if position matches and byte is valid
                selectedBytes[outPos][charIdx][byteIdx] <== 
                    byteSelectors[outPos][charIdx][byteIdx].out * 
                    validBytes[charIdx][byteIdx] * 
                    utf32Bytes[charIdx][byteIdx];
            }
            
            // Sum all byte contributions from this character for this output position
            characterContributions[outPos][charIdx] <== 
                selectedBytes[outPos][charIdx][0] + 
                selectedBytes[outPos][charIdx][1] + 
                selectedBytes[outPos][charIdx][2] + 
                selectedBytes[outPos][charIdx][3];
        }
        
        // Sum contributions from all characters for this output position
        signal tempSum[length];
        tempSum[0] <== characterContributions[outPos][0];
        
        for (var charIdx = 1; charIdx < length; charIdx++) {
            tempSum[charIdx] <== tempSum[charIdx-1] + characterContributions[outPos][charIdx];
        }
        
        // Final byte value for this position
        bytes[outPos] <== tempSum[length-1];
    }
}


/*
 * Usage Examples:
 * 
 * 1. Compact encoding (no gaps):
 *    component main = Utf8StringEncoder(3);
 * 
 * 2. Simple encoding (with gaps):
 *    component main = SimpleUtf8StringEncoder(3);
 * 
 * Input JSON example:
 * {
 *   "codepoints": [72, 101, 108, 108, 111]  // "Hello"
 * }
 * 
 * Output for compact encoding:
 * {
 *   "bytes": [72, 101, 108, 108, 111, 0, 0, 0, ...],
 *   "totalBytes": 5
 * }
 * 
 * Input with multi-byte characters:
 * {
 *   "codepoints": [65, 20013, 128640]  // "A中🚀"
 * }
 * 
 * Output for compact encoding:
 * {
 *   "bytes": [65, 228, 184, 173, 240, 159, 154, 128, 0, 0, 0, 0],
 *   "totalBytes": 8
 * }
 * 
 * Output for simple encoding:
 * {
 *   "bytes": [65, 0, 0, 0, 228, 184, 173, 0, 240, 159, 154, 128],
 *   "totalBytes": 8
 * }
 */