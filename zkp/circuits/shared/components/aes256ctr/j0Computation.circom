pragma circom 2.2.2;

include "galoisField.circom";

/**
 * GF(2^128) multiplication for GHASH
 * Implements multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1
 */
template GF128Multiply() {
    signal input {byte} x[16];
    signal input {byte} y[16];
    signal output {byte} result[16];
    
    // Convert bytes to bits for easier manipulation
    signal xBits[128];
    signal yBits[128];
    
    component xToBits[16];
    component yToBits[16];
    
    for (var i = 0; i < 16; i++) {
        xToBits[i] = Num2Bits(8);
        yToBits[i] = Num2Bits(8);
        xToBits[i].in <== x[i];
        yToBits[i].in <== y[i];
        
        for (var j = 0; j < 8; j++) {
            xBits[i * 8 + j] <== xToBits[i].out[7 - j]; // MSB first
            yBits[i * 8 + j] <== yToBits[i].out[7 - j];
        }
    }
    
    // Intermediate results for each bit position
    signal intermediate[129][128];
    signal vBits[129][128];
    
    // Initialize v = y
    for (var j = 0; j < 128; j++) {
        vBits[0][j] <== yBits[j];
        intermediate[0][j] <== 0;
    }
    
    // Process each bit of x
    for (var i = 0; i < 128; i++) {
        // If x[i] == 1, add v to result
        for (var j = 0; j < 128; j++) {
            intermediate[i + 1][j] <== intermediate[i][j] + xBits[i] * vBits[i][j];
        }
        
        // Right shift v by one bit
        signal carry <== vBits[i][127];
        
        for (var j = 127; j > 0; j--) {
            vBits[i + 1][j] <== vBits[i][j - 1];
        }
        vBits[i + 1][0] <== 0;
        
        // If carry, XOR with reduction polynomial 0xE1
        // Polynomial: x^128 + x^7 + x^2 + x + 1 = 11100001 in binary
        vBits[i + 1][0] <== vBits[i + 1][0] + carry * 1;
        vBits[i + 1][1] <== vBits[i + 1][1] + carry * 1;
        vBits[i + 1][2] <== vBits[i + 1][2] + carry * 1;
        vBits[i + 1][7] <== vBits[i + 1][7] + carry * 1;
    }
    
    // Convert final result bits to bytes (with modulo 2)
    signal resultBits[128];
    for (var i = 0; i < 128; i++) {
        resultBits[i] <== intermediate[128][i] % 2;
    }
    
    component resultBitsToBytes[16];
    for (var i = 0; i < 16; i++) {
        resultBitsToBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            resultBitsToBytes[i].in[7 - j] <== resultBits[i * 8 + j];
        }
        result[i] <== resultBitsToBytes[i].out;
    }
}

/**
 * ComputeJ0 for standard 12-byte (96-bit) IV
 * J0 = IV || 0x00000001
 */
template ComputeJ0_96bit() {
    signal input {byte} iv[12];
    signal output {byte} j0[16];
    
    // Copy IV to first 12 bytes
    for (var i = 0; i < 12; i++) {
        j0[i] <== iv[i];
    }
    
    // Set last 4 bytes to 0x00000001 (big-endian)
    j0[12] <== 0x00;
    j0[13] <== 0x00;
    j0[14] <== 0x00;
    j0[15] <== 0x01;
}

/**
 * ComputeJ0 for non-standard IV lengths (not 96 bits)
 * Supports IV lengths from 1 to 16 bytes
 * J0 = GHASH_H(IV || 0^s || 0^64 || [len(IV)]64)
 */
template ComputeJ0_Variable(ivLengthBytes) {
    assert(ivLengthBytes > 0 && ivLengthBytes <= 16);
    assert(ivLengthBytes != 12); // Use ComputeJ0_96bit for 12-byte IVs
    
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