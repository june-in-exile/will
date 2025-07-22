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
 * @param plaintextBlocks - Number of plaintext blocks
 * @param aadBytes - Number of bytes for additional authenticated data
 */
template GcmEncrypt(keyBits, ivLength, plaintextBlocks, aadBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }
    
    signal input {byte} plaintext[plaintextBlocks * 16];
    input Word() key[Nk];
    signal input {byte} iv[ivLength];
    signal input {byte} aad[aadBytes];
    
    signal output {byte} ciphertext[plaintextBlocks * 16];
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
    signal ciphertext[plaintextBlocks * 16] = CtrEncrypt(keyBits, plaintextBlocks)(plaintext, key, iv);
    
    // Step 4: Compute authentication tag using GHASH
    // Calculate total blocks needed for GHASH input
    var aadPadding = (16 - (aadBytes * 16) % 16) % 16;
    var ciphertextPadding = (16 - (plaintextBlocks * 16) % 16) % 16;
    var totalAuthBlocks = aadBytes + ((aadPadding + 15) \ 16) + plaintextBlocks + ((ciphertextPadding + 15) \ 16) + 1;
    
    // Construct GHASH input: AAD || 0^v || C || 0^u || [len(AAD)]64 || [len(C)]64
    signal {byte} ghashInput[totalAuthBlocks * 16];
    var offset = 0;
    
    // Add AAD
    for (var i = 0; i < aadBytes * 16; i++) {
        ghashInput[offset + i] <== aad[i];
    }
    offset += aadBytes * 16;
    
    // Add AAD padding
    for (var i = 0; i < aadPadding; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += aadPadding;
    
    // Add ciphertext
    for (var i = 0; i < plaintextBlocks * 16; i++) {
        ghashInput[offset + i] <== ciphertext[i];
    }
    offset += plaintextBlocks * 16;
    
    // Add ciphertext padding
    for (var i = 0; i < ciphertextPadding; i++) {
        ghashInput[offset + i] <== 0;
    }
    offset += ciphertextPadding;
    
    // Add length information (64-bit big endian)
    var aadLengthBits = aadBytes * 16 * 8;
    var ciphertextLengthBits = plaintextBlocks * 16 * 8;
    
    // AAD length in bits (64-bit big-endian)
    ghashInput[offset + 0] <== (aadLengthBits >> 56) & 0xFF;
    ghashInput[offset + 1] <== (aadLengthBits >> 48) & 0xFF;
    ghashInput[offset + 2] <== (aadLengthBits >> 40) & 0xFF;
    ghashInput[offset + 3] <== (aadLengthBits >> 32) & 0xFF;
    ghashInput[offset + 4] <== (aadLengthBits >> 24) & 0xFF;
    ghashInput[offset + 5] <== (aadLengthBits >> 16) & 0xFF;
    ghashInput[offset + 6] <== (aadLengthBits >> 8) & 0xFF;
    ghashInput[offset + 7] <== aadLengthBits & 0xFF;
    
    // Ciphertext length in bits (64-bit big-endian)
    ghashInput[offset + 8] <== (ciphertextLengthBits >> 56) & 0xFF;
    ghashInput[offset + 9] <== (ciphertextLengthBits >> 48) & 0xFF;
    ghashInput[offset + 10] <== (ciphertextLengthBits >> 40) & 0xFF;
    ghashInput[offset + 11] <== (ciphertextLengthBits >> 32) & 0xFF;
    ghashInput[offset + 12] <== (ciphertextLengthBits >> 24) & 0xFF;
    ghashInput[offset + 13] <== (ciphertextLengthBits >> 16) & 0xFF;
    ghashInput[offset + 14] <== (ciphertextLengthBits >> 8) & 0xFF;
    ghashInput[offset + 15] <== ciphertextLengthBits & 0xFF;
    
    // Compute GHASH
    component ghash = GHashOptimized(totalAuthBlocks);
    for (var i = 0; i < totalAuthBlocks * 16; i++) {
        ghash.data[i] <== ghashInput[i];
    }
    for (var i = 0; i < 16; i++) {
        ghash.hashKey[i] <== hashKey[i];
    }
    
    // Step 5: Final tag calculation: T = GCTR_K(J0, S) = S ⊕ CIPH_K(J0)
    component tagMaskGen = EncryptBlock(keyBits);
    for (var i = 0; i < 16; i++) {
        tagMaskGen.plaintext[i] <== j0[i];
    }
    for (var i = 0; i < Nk; i++) {
        for (var j = 0; j < 4; j++) {
            tagMaskGen.key[i].bytes[j] <== key[i].bytes[j];
        }
    }
    
    // XOR GHASH result with encrypted J0 to get final authentication tag
    component tagXor[16];
    for (var i = 0; i < 16; i++) {
        tagXor[i] = BitwiseXor(2, 8);
        tagXor[i].in[0] <== ghash.result[i];
        tagXor[i].in[1] <== tagMaskGen.ciphertext[i];
        authTag[i] <== tagXor[i].out;
    }
}