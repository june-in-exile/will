pragma circom 2.2.2;

include "../shared/components/aes-gcm/counterIncrement.circom";
include "../shared/components/aes-gcm/encryptBlock.circom";
include "../shared/components/bus.circom";
include "../shared/components/bits.circom";

/**
 * AES CTR Mode Encryption Circuit
 * Implements the Counter (CTR) mode of operation for AES encryption
 * Following NIST SP 800-38A standard for counter mode
 * 
 * CTR mode converts AES block cipher into a stream cipher by:
 * 1. Incrementing a counter for each block
 * 2. Encrypting the counter with AES
 * 3. XORing the result with plaintext
 * 
 * @param keyBits - AES key size in bits (128, 192, or 256)
 * @param numblocks - number of blocks to process
 *
 * @note CtrDecrypt can be implemented by swapping plaintext and ciphertext
 */
template CtrEncrypt(keyBits, numblocks) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }
    
    signal input {byte} plaintext[numblocks * 16]; // Plaintext data in bytes
    input Word() key[Nk]; // AES key using Word bus structure
    signal input {byte} iv[16]; // Initial counter value
    signal output {byte} ciphertext[numblocks * 16]; // Encrypted output
    
    // Counter state array - stores counter value for each block
    signal {byte} counters[numblocks][16];
    counters[0] <== iv;
    
    // Generate incremented (for last 4 bytes only) counters for each block
    for (var i = 1; i < numblocks; i++) {
        counters[i] <== IncrementCounterOptimized()(counters[i - 1]);
    }
    
    // Encrypt each counter to generate keystream
    signal {byte} keystreams[numblocks][16];
    for (var i = 0; i < numblocks; i++) {
        keystreams[i] <== parallel EncryptBlock(keyBits)(counters[i], key);
    }
    
    // XOR plaintext with keystream to produce ciphertext
    for (var i = 0; i < numblocks; i++) {
        for (var j = 0; j < 16; j++) {
            ciphertext[i * 16 + j] <== BitwiseXor(2, 8)([plaintext[i * 16 + j], keystreams[i][j]]);
        }
    }
}