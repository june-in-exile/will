pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "ctrEncrypt.circom";
include "counterIncrement.circom";
include "galoisField.circom";
include "../arithmetic.circom";
include "../bus.circom";
include "../bits.circom";

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
template ComputeJ0NonStandard(ivLengthInBytes) {
    assert(ivLengthInBytes > 0 && ivLengthInBytes <= 64);
    assert(ivLengthInBytes != 12); // Use ComputeJ0Standard for 12-byte IVs
    
    signal input {byte} iv[ivLengthInBytes];
    signal input {byte} hashKey[16];
    signal output {byte} j0[16];
    
    // Calculate padding needed
    var ivLengthInBits = ivLengthInBytes * 8;
    var s = (128 - (ivLengthInBits % 128)) % 128;
    var paddingBytes = s \ 8;
    
    // Calculate total GHASH input length
    // IV + padding + 8 bytes zeros + 8 bytes length
    var totalBytes = ivLengthInBytes + paddingBytes + 8 + 8;
    var numBlocks = totalBytes \ 16;
    assert(numBlocks * 16 == totalBytes);
    
    // Build GHASH input
    signal {byte} ghashInput[numBlocks * 16];
    
    var offset = 0;
    
    // Copy IV
    for (var i = 0; i < ivLengthInBytes; i++) {
        ghashInput[offset + i] <== iv[i];
    }
    offset += ivLengthInBytes;
    
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
    // Since ivLengthInBits <= 512 (2^9), at least upper 48 bits are zero
    for (var i = 0; i < 6; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += 6;
    
    // Convert ivLengthInBits to big-endian bits
    signal ivLengthBits[16] <== Num2Bits(16)(ivLengthInBits);
    signal ivLengthMSB[8], ivLengthLSB[8];

    for (var i = 0; i < 8; i++) {
        (ivLengthMSB[i], ivLengthLSB[i]) <== (ivLengthBits[i + 8], ivLengthBits[i]);
    }
    (ghashInput[offset], ghashInput[offset + 1]) <== (Bits2Num(8)(ivLengthMSB), Bits2Num(8)(ivLengthLSB));

    // Compute GHASH
    j0 <== GHash(numBlocks)(ghashInput, hashKey);
}

/**
 * Main AES-GCM Encryption Template
 * Combines all components to provide complete AES-GCM functionality
 * 
 * @param keyBits - AES key size (128, 192, or 256)
 * @param ivLength - IV length in bytes
 * @param textLengthBytes - Number of bytes to process
 * @param aadLengthBytes - Number of bytes for additional authenticated data
 */
template GcmEncrypt(keyBits, ivLength, textLengthBytes, aadLengthBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }

    signal input {byte} plaintext[textLengthBytes];
    input Word() key[Nk];
    signal input {byte} iv[ivLength];
    signal input {byte} aad[aadLengthBytes];
    signal output {byte} ciphertext[textLengthBytes];
    signal output {byte} authTag[16];

    // Step 1: Generate hash subkey H = CIPH_K(0^128)
    signal {byte} zeroBlock[16];
    for (var i = 0; i < 16; i++) {
        zeroBlock[i] <== 0;
    }
    signal {byte} hashKey[16] <== EncryptBlock(keyBits)(zeroBlock, key);
    
    // Step 2: Compute J0 based on IV length
    signal {byte} j0[16];
    if (ivLength == 12) {
        // Standard 96-bit IV case: J0 = IV || 0x00000001
        j0 <== ComputeJ0Standard()(iv);
    } else {
        // Non-standard IV length: use GHASH
        j0 <== ComputeJ0NonStandard(ivLength)(iv, hashKey);
    }

    // Step 3: CTR encryption with incremented J0
    ciphertext <== CtrEncrypt(keyBits, textLengthBytes)(plaintext, key, IncrementCounterOptimized()(j0));
    
    // Step 4: Calculate total blocks needed for GHASH input
    var aadNumBlocks = (aadLengthBytes + 15) \ 16;
    var textNumBlocks = (textLengthBytes + 15) \ 16;
    var aadPaddingLengthBytes = (16 - aadLengthBytes % 16) % 16;
    var textPaddingLengthBytes = (16 - textLengthBytes % 16) % 16;
    var totalAuthBlocks = aadNumBlocks + textNumBlocks + 1;
    
    // Step 5: Compute GHASH S = GHASH_H(AAD || 0^v || C || 0^u || [len(AAD)]64 || [len(C)]64)
    // Construct GHASH input
    signal {byte} ghashInput[totalAuthBlocks * 16];
    var offset = 0;
    
    // Add AAD
    for (var i = 0; i < aadLengthBytes; i++) {
        ghashInput[offset + i] <== aad[i];
    }
    offset += aadLengthBytes;
    
    // Add AAD padding
    for (var i = 0; i < aadPaddingLengthBytes; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += aadPaddingLengthBytes;
    
    // Add ciphertext
    for (var i = 0; i < textLengthBytes; i++) {
        ghashInput[offset + i] <== ciphertext[i];
    }
    offset += textLengthBytes;
    
    // Add ciphertext padding
    for (var i = 0; i < textPaddingLengthBytes; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += textPaddingLengthBytes;
    
    // Add length information (64-bit big endian)
    var aadLengthBits = aadLengthBytes * 8;
    signal accAadLengthBits[8];
    for (var i = 0; i < 8; i++) {
        ghashInput[offset + i] <-- (aadLengthBits >> 8 * (7 - i)) & 0xFF;
        if (i == 0) {
            accAadLengthBits[i] <== ghashInput[offset + i];
        } else {
            accAadLengthBits[i] <== ghashInput[offset + i - 1] * 2**8 + ghashInput[offset + i];
        }
    }
    accAadLengthBits[7] === aadLengthBits;

    offset += 8;

    var textLengthBits = textLengthBytes * 8;
    signal accTextLengthBits[8];
    for (var i = 0; i < 8; i++) {
        ghashInput[offset + i] <-- (textLengthBits >> 8 * (7 - i)) & 0xFF;
        if (i == 0) {
            accTextLengthBits[i] <== ghashInput[offset + i];
        } else {
            accTextLengthBits[i] <== ghashInput[offset + i - 1] * 2**8 + ghashInput[offset + i];
        }
    }
    accTextLengthBits[7] === textLengthBits;
    
    // Compute GHASH
    signal {byte} S[16] <== GHashOptimized(totalAuthBlocks)(ghashInput, hashKey);
    
    // Step 6: Final tag calculation: T = GCTR_K(J0, S) = S ⊕ CIPH_K(J0)
    signal {byte} tagMask[16] <== EncryptBlock(keyBits)(j0, key);
    for (var i = 0; i < 16; i++) {
        authTag[i] <== BitwiseXor(2, 8)([S[i], tagMask[i]]);
    }
}

/**
 * Main AES-GCM Decryption Template
 * Based on GcmEncrypt with authTag comparison
 * 
 * @param keyBits - AES key size (128, 192, or 256)
 * @param ivLength - IV length in bytes
 * @param textLengthBytes - Number of bytes to process
 * @param aadLengthBytes - Number of bytes for additional authenticated data
 */
template GcmDecrypt(keyBits, ivLength, textLengthBytes, aadLengthBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }

    signal input {byte} ciphertext[textLengthBytes];
    input Word() key[Nk];
    signal input {byte} iv[ivLength];
    signal input {byte} authTag[16];
    signal input {byte} aad[aadLengthBytes];
    signal output {byte} plaintext[textLengthBytes];

    // Step 1: Generate hash subkey H = CIPH_K(0^128)
    signal {byte} zeroBlock[16];
    for (var i = 0; i < 16; i++) {
        zeroBlock[i] <== 0;
    }
    signal {byte} hashKey[16] <== EncryptBlock(keyBits)(zeroBlock, key);
    
    // Step 2: Compute J0 based on IV length
    signal {byte} j0[16];
    if (ivLength == 12) {
        // Standard 96-bit IV case: J0 = IV || 0x00000001
        j0 <== ComputeJ0Standard()(iv);
    } else {
        // Non-standard IV length: use GHASH
        j0 <== ComputeJ0NonStandard(ivLength)(iv, hashKey);
    }

    // Step 3: CTR encryption with incremented J0
    plaintext <== CtrEncrypt(keyBits, textLengthBytes)(ciphertext, key, IncrementCounterOptimized()(j0));
    
    // Step 4: Calculate total blocks needed for GHASH input
    var aadNumBlocks = (aadLengthBytes + 15) \ 16;
    var textNumBlocks = (textLengthBytes + 15) \ 16;
    var aadPaddingLengthBytes = (16 - aadLengthBytes % 16) % 16;
    var textPaddingLengthBytes = (16 - textLengthBytes % 16) % 16;
    var totalAuthBlocks = aadNumBlocks + textNumBlocks + 1;
    
    // Step 5: Compute GHASH S = GHASH_H(AAD || 0^v || C || 0^u || [len(AAD)]64 || [len(C)]64)
    // Construct GHASH input
    signal {byte} ghashInput[totalAuthBlocks * 16];
    var offset = 0;
    
    // Add AAD
    for (var i = 0; i < aadLengthBytes; i++) {
        ghashInput[offset + i] <== aad[i];
    }
    offset += aadLengthBytes;
    
    // Add AAD padding
    for (var i = 0; i < aadPaddingLengthBytes; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += aadPaddingLengthBytes;
    
    // Add ciphertext
    for (var i = 0; i < textLengthBytes; i++) {
        ghashInput[offset + i] <== ciphertext[i];
    }
    offset += textLengthBytes;
    
    // Add ciphertext padding
    for (var i = 0; i < textPaddingLengthBytes; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += textPaddingLengthBytes;
    
    // Add length information (64-bit big endian)
    var aadLengthBits = aadLengthBytes * 8;
    signal accAadLengthBits[8];
    for (var i = 0; i < 8; i++) {
        ghashInput[offset + i] <-- (aadLengthBits >> 8 * (7 - i)) & 0xFF;
        if (i == 0) {
            accAadLengthBits[i] <== ghashInput[offset + i];
        } else {
            accAadLengthBits[i] <== ghashInput[offset + i - 1] * 2**8 + ghashInput[offset + i];
        }
    }
    accAadLengthBits[7] === aadLengthBits;

    offset += 8;

    var textLengthBits = textLengthBytes * 8;
    signal accTextLengthBits[8];
    for (var i = 0; i < 8; i++) {
        ghashInput[offset + i] <-- (textLengthBits >> 8 * (7 - i)) & 0xFF;
        if (i == 0) {
            accTextLengthBits[i] <== ghashInput[offset + i];
        } else {
            accTextLengthBits[i] <== ghashInput[offset + i - 1] * 2**8 + ghashInput[offset + i];
        }
    }
    accTextLengthBits[7] === textLengthBits;
    
    // Compute GHASH
    signal {byte} S[16] <== GHashOptimized(totalAuthBlocks)(ghashInput, hashKey);
    
    // Step 6: Final tag calculation: T = GCTR_K(J0, S) = S ⊕ CIPH_K(J0)
    signal {byte} tagMask[16] <== EncryptBlock(keyBits)(j0, key);
    signal {byte} expectedAuthTag[16];
    for (var i = 0; i < 16; i++) {
        expectedAuthTag[i] <== BitwiseXor(2, 8)([S[i], tagMask[i]]);
        expectedAuthTag[i] === authTag[i];
    }
}
