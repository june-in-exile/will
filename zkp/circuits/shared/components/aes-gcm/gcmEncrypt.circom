pragma circom 2.2.2;

include "counterIncrement.circom";
include "ctrEncrypt.circom";
include "encryptBlock.circom";
include "galoisField.circom";
include "j0Computation.circom";
include "../bus.circom";
include "../bits.circom";

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

    signal {byte} incrementedJ0[16] <== IncrementCounterOptimized()(j0);
    
    // Step 3: CTR encryption with incremented J0
    ciphertext = CtrEncrypt(keyBits, textLengthBytes)(plaintext, key, iv);
    
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
    var textLengthBits = textLengthBytes * 8;
    
    // AAD length in bits (64-bit big-endian)
    ghashInput[offset + 0] <-- (aadLengthBits >> 56) & 0xFF;
    ghashInput[offset + 1] <-- (aadLengthBits >> 48) & 0xFF;
    ghashInput[offset + 2] <-- (aadLengthBits >> 40) & 0xFF;
    ghashInput[offset + 3] <-- (aadLengthBits >> 32) & 0xFF;
    ghashInput[offset + 4] <-- (aadLengthBits >> 24) & 0xFF;
    ghashInput[offset + 5] <-- (aadLengthBits >> 16) & 0xFF;
    ghashInput[offset + 6] <-- (aadLengthBits >> 8) & 0xFF;
    ghashInput[offset + 7] <-- aadLengthBits & 0xFF;
    
    signal accAadLengthBits[8];
    accAadLengthBits[0] <== ghashInput[offset + 0];
    for (i = 1; i < 8; i++) {
        accAadLengthBits[i] <== ghashInput[offset + i - 1] * 2**8 + ghashInput[offset + i];
    }
    accAadLengthBits[7] === aadLengthBits;

    offset += 8;

    // Ciphertext length in bits (64-bit big-endian)
    ghashInput[offset + 0] <== (textLengthBits >> 56) & 0xFF;
    ghashInput[offset + 1] <== (textLengthBits >> 48) & 0xFF;
    ghashInput[offset + 2] <== (textLengthBits >> 40) & 0xFF;
    ghashInput[offset + 3] <== (textLengthBits >> 32) & 0xFF;
    ghashInput[offset + 4] <== (textLengthBits >> 24) & 0xFF;
    ghashInput[offset + 5] <== (textLengthBits >> 16) & 0xFF;
    ghashInput[offset + 6] <== (textLengthBits >> 8) & 0xFF;
    ghashInput[offset + 7] <== textLengthBits & 0xFF;

    signal accTextLengthBits[8];
    accAadLengthBits[0] <== ghashInput[offset + 0];
    for (i = 1; i < 8; i++) {
        accTextLengthBits[i] <== ghashInput[offset + i - 1] * 2**8 + ghashInput[offset + i];
    }
    accTextLengthBits[7] === textLengthBits;
    
    // Compute GHASH
    signal S <== GHashOptimized(totalAuthBlocks)(ghashInput, hashKey);
    
    // Step 6: Final tag calculation: T = GCTR_K(J0, S) = S ⊕ CIPH_K(J0)
    signal tagMask <== EncryptBlock(keyBits)(j0, key);
    authTag <== BitwiseXor(2, 128)(S, tagMask);
}