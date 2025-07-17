pragma circom 2.2.2;

include "counterIncrement.circom";
include "encryptBlock.circom";
include "../buss.circom";
include "../bits.circom";

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
 * @param maxBlocks - Maximum number of blocks this circuit can process
 */
template CTREncrypt(keyBits, maxBlocks) {
    var (Nk, Nb, Nr);
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        (Nk, Nb, Nr) = (4,4,10);
    } else if (keyBits == 192) {
        (Nk, Nb, Nr) = (6,4,12);
    } else {
        (Nk, Nb, Nr) = (8,4,14);
    }
    
    // Input signals
    signal input {byte} plaintext[maxBlocks * 16]; // Plaintext data in bytes
    input Word() key[Nk]; // AES key using Word bus structure
    signal input {byte} j0[16]; // Initial counter value (J0) from GCM
    signal input numBlocks; // Actual number of blocks to process
    
    // Output signals
    signal output {byte} ciphertext[maxBlocks * 16]; // Encrypted output
    
    // Validate that numBlocks is within circuit capacity
    component numBlocksCheck = LessEqualThan(8);
    numBlocksCheck.in[0] <== numBlocks;
    numBlocksCheck.in[1] <== maxBlocks;
    numBlocksCheck.out === 1;
    
    // Counter state array - stores counter value for each block
    signal {byte} counters[maxBlocks + 1][16];
    counters[0] <== j0; // Initialize with J0
    
    // Generate incremented counters for each block
    // In GCM, only the last 4 bytes of the counter are incremented
    component counterIncrements[maxBlocks];
    for (var i = 0; i < maxBlocks; i++) {
        counterIncrements[i] = IncreaseLast4Bytes();
        counterIncrements[i].in <== counters[i];
        counters[i + 1] <== counterIncrements[i].out;
    }
    
    // AES encryption components - one per block
    component aesBlocks[maxBlocks];
    signal {byte} keystreams[maxBlocks][16]; // Encrypted counter values (keystream)
    
    // Encrypt each counter to generate keystream
    for (var i = 0; i < maxBlocks; i++) {
        aesBlocks[i] = EncryptBlock(keyBits);
        
        // Use incremented counter as AES input
        for (var j = 0; j < 16; j++) {
            aesBlocks[i].plaintext[j] <== counters[i + 1][j];
        }
        
        // Apply same key to all blocks
        for (var j = 0; j < Nk; j++) {
            aesBlocks[i].key[j] <== key[j];
        }
        
        // Store resulting keystream
        for (var j = 0; j < 16; j++) {
            keystreams[i][j] <== aesBlocks[i].ciphertext[j];
        }
    }
    
    // XOR plaintext with keystream to produce ciphertext
    component xorGates[maxBlocks][16];
    component blockSelectors[maxBlocks];
    
    for (var i = 0; i < maxBlocks; i++) {
        // Determine if this block should be processed based on numBlocks
        blockSelectors[i] = LessThan(8);
        blockSelectors[i].in[0] <== i;
        blockSelectors[i].in[1] <== numBlocks;
        
        // Perform XOR operation for each byte in the block
        for (var j = 0; j < 16; j++) {
            xorGates[i][j] = BitwiseXor(2, 8);
            xorGates[i][j].in[0] <== plaintext[i * 16 + j];
            xorGates[i][j].in[1] <== keystreams[i][j];
            
            // Output XOR result for active blocks, plaintext for inactive blocks
            ciphertext[i * 16 + j] <== blockSelectors[i].out * xorGates[i][j].out + 
                                      (1 - blockSelectors[i].out) * plaintext[i * 16 + j];
        }
    }
}
