pragma circom 2.2.2;

include "galoisField.circom";

/**
 * ComputeJ0 for standard 12-byte (96-bit) IV
 * J0 = IV || 0x00000001
 */
template ComputeJ0Standard() {
    signal input {byte} iv[12];
    signal output {byte} j0[16];
    
    for (var i = 0; i < 12; i++) {
        j0[i] <== iv[i];
    }
    
    (j0[12], j0[13], j0[14], j0[15]) <== (0x00, 0x00, 0x00, 0x01);
}

/**
 * ComputeJ0 for non-standard IV lengths (not 96 bits)
 * Supports IV lengths from 1 to 16 bytes
 * J0 = GHASH_H(IV || 0^s || 0^64 || [len(IV)]64)
 */
template ComputeJ0NonStandard(ivLengthBytes) {
    assert(ivLengthBytes > 0 && ivLengthBytes <= 64);
    assert(ivLengthBytes != 12); // Use ComputeJ0Standard for 12-byte IVs
    
    signal input {byte} iv[ivLengthBytes];
    signal input {byte} hashKey[16];
    signal output {byte} j0[16];
    
    // Calculate padding needed
    var ivLengthBits = ivLengthBytes * 8;
    var s = (128 - (ivLengthBits % 128)) % 128;
    var paddingBytes = s / 8;
    
    // Calculate total GHASH input length
    // IV + padding + 8 bytes zeros + 8 bytes length
    var totalBytes = ivLengthBytes + paddingBytes + 8 + 8;
    var numBlocks = totalBytes / 16;
    assert(numBlocks * 16 == totalBytes); // Ensure it's a multiple of 16
    
    // Build GHASH input
    signal ghashInput[numBlocks * 16];
    
    var offset = 0;
    
    // Copy IV
    for (var i = 0; i < ivLengthBytes; i++) {
        ghashInput[offset + i] <== iv[i];
    }
    offset += ivLengthBytes;
    
    // Add padding zeros
    for (var i = 0; i < paddingBytes; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += paddingBytes;
    
    // Add 64 zero bits (8 bytes)
    for (var i = 0; i < 8; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += 8;
    
    // Add IV length in bits as 64-bit big-endian
    // Since ivLengthBits < 2^32, upper 32 bits are zero
    for (var i = 0; i < 4; i++) {
        ghashInput[offset + i] <== 0;
    }
    
    // Convert ivLengthBits to big-endian bytes
    component lengthToBytes = Num2Bits(32);
    lengthToBytes.in <== ivLengthBits;
    
    component bytePack[4];
    for (var i = 0; i < 4; i++) {
        bytePack[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            bytePack[i].in[j] <== lengthToBytes.out[24 - i * 8 + j];
        }
        ghashInput[offset + 4 + i] <== bytePack[i].out;
    }
    
    // Compute GHASH
    component ghash = GHash(numBlocks);
    for (var i = 0; i < numBlocks * 16; i++) {
        ghash.data[i] <== ghashInput[i];
    }
    for (var i = 0; i < 16; i++) {
        ghash.hashKey[i] <== hashKey[i];
        j0[i] <== ghash.result[i];
    }
}

/**
 * Example usage for different IV lengths
 */

// For 12-byte IV (standard case)
// component main = ComputeJ0_96bit();

// For 8-byte IV
// component main = ComputeJ0_Variable(8);

// For 16-byte IV
// component main = ComputeJ0_Variable(16);