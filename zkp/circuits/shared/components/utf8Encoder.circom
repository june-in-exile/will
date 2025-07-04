pragma circom 2.2.2;

template Utf8Encoder(inputLength, outputLength) {
    signal input bytes[inputLength];
    signal output utf8Bytes[outputLength];
    
    // 簡化實現：假設都是 ASCII 字符 (1 字節 UTF-8)
    // 完整實現需要處理多字節 UTF-8 字符
    for (var i = 0; i < inputLength && i < outputLength; i++) {
        utf8Bytes[i] <== bytes[i];
    }
}