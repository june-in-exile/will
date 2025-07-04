pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";
include "../shared/components/base64GroupDecoder.circom";
include "../shared/components/range.circom";
include "../shared/components/mod.circom";

/**
 * Complete Base64 decoder (supports multiple groups)
 * This is the version for future integration into main circuit
 */
template Base64Decoder(inputLength,outputLength) {
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