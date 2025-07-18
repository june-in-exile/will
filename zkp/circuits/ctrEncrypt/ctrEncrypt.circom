pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux1.circom";
include "../shared/components/aes256ctr/counterIncrement.circom";
include "../shared/components/aes256ctr/encryptBlock.circom";
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
 * @param maxBlocksBits - Log2 of maximum number of blocks (e.g., 3 for 8 blocks, 4 for 16 blocks)
 */
template CtrEncrypt(keyBits, maxBlocksBits) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }

    var maxBlocks = 2 ** maxBlocksBits;
    
    signal input {byte} plaintext[maxBlocks * 16]; // Plaintext data in bytes
    input Word() key[Nk]; // AES key using Word bus structure
    signal input {byte} j0[16]; // Initial counter value (J0) from GCM
    signal input numBlocks; // Actual number of blocks to process
    signal output {byte} ciphertext[maxBlocks * 16]; // Encrypted output
    
    // Validate that numBlocks is within circuit capacity
    _ <== Num2Bits(maxBlocks)(numBlocks + 1);
    
    // Counter state array - stores counter value for each block
    signal {byte} counters[maxBlocks + 1][16];
    counters[0] <== j0; // Initialize with J0
    
    // Generate incremented counters for each block
    // In GCM, only the last 4 bytes of the counter are incremented
    component counterIncrements[maxBlocks];
    for (var i = 0; i < maxBlocks; i++) {
        counters[i + 1] <== IncrementCounter()(counters[i]);
    }
    
    // AES encryption components - one per block
    signal {byte} keystreams[maxBlocks][16];
    
    // Encrypt each counter to generate keystream
    for (var i = 0; i < maxBlocks; i++) {
        keystreams[i] <== EncryptBlock(keyBits)(counters[i + 1], key);
    }
    
    // XOR plaintext with keystream to produce ciphertext
    signal selected[maxBlocks];
    signal cipherBlocks[maxBlocks][16];
    
    for (var i = 0; i < maxBlocks; i++) {
        // Determine if this block should be processed based on numBlocks
        selected[i] <== LessThan(maxBlocksBits)([i, numBlocks]);
        
        // Perform XOR operation for each byte in the block
        for (var j = 0; j < 16; j++) {
            cipherBlocks[i][j] <== BitwiseXor(2, 8)([plaintext[i * 16 + j], keystreams[i][j]]);
            
            // Output XOR result for active blocks, plaintext for inactive blocks
            ciphertext[i * 16 + j] <== Mux1()([cipherBlocks[i][j], plaintext[i * 16 + j]], selected[i]);
        }
    }
}


// Auto updated: 2025-07-18T00:29:12.193Z
bus UntaggedWord() {
    signal bytes[4];
}

template UntaggedCtrEncrypt(keyBits, maxBlocksBits) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }
    var maxBlocks = 2 ** maxBlocksBits;

    signal input plaintext[maxBlocks * 16];
    input UntaggedWord() key[Nk];
    signal input j0[16];
    signal input numBlocks;
    signal output {byte} ciphertext[maxBlocks * 16];

    signal {byte} _plaintext[maxBlocks * 16];
    _plaintext <== plaintext;
    signal {byte} _j0[16];
    _j0 <== j0;

    Word() _key[Nk];

    for (var i = 0; i < Nk; i++) {
        _key[i].bytes <== key[i].bytes;
    }


    component ctrencryptComponent = CtrEncrypt(keyBits, maxBlocksBits);
    ctrencryptComponent.plaintext <== _plaintext;
    ctrencryptComponent.key <== _key;
    ctrencryptComponent.j0 <== _j0;
    ctrencryptComponent.numBlocks <== numBlocks;
    ciphertext <== ctrencryptComponent.ciphertext;
}

component main = UntaggedCtrEncrypt(128, 2);
