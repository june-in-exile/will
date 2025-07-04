pragma circom 2.2.2;

include "../shared/components/asciiToBase64.circom";
include "../shared/components/base64GroupDecoder.circom";
include "../shared/components/range.circom";
include "../shared/components/arithmetic.circom";

template Base64Decoder(inputLength,outputLength) {
    signal input asciis[inputLength];   // ASCII values of base64 characters (0-127)
    signal output bytes[outputLength];  // Decoded bytes (0-255)
    
    assert(inputLength % 4 == 0);
    var groups = inputLength \ 4;
    assert(outputLength == groups*3);
    
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

component main = Base64Decoder(4,3);