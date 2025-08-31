pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
// include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";
include "keccakF1600.circom";

/**
 * Convert 200 bytes to Keccak state array (5x5x64 bits)
 * Uses little-endian byte ordering for each 64-bit lane
 */
template BytesToStateArray() {
    signal input {byte} bytes[200]; // 1600-bit state size (200 bytes)
    signal output {bit} stateArray[5][5][64]; // 5x5 matrix of 64-bit lanes
    
    // Convert each 8-byte sequence to a 64-bit lane
    signal byteBits[5][5][8][8];
    signal laneBits[5][5][64];
    for (var y = 0; y < 5; y++) {
        for (var x = 0; x < 5; x++) {
            var laneIndex = y * 5 + x; // Lane index (0-24)
            var byteOffset = laneIndex * 8; // Each lane is 8 bytes
            
            // Convert 8 bytes to 64 bits (little-endian)
            for (var byteIdx = 0; byteIdx < 8; byteIdx++) {
                byteBits[x][y][byteIdx] <== Num2Bits(8)(bytes[byteOffset + byteIdx]);
                
                // Place bits in little-endian order
                for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
                    laneBits[x][y][byteIdx * 8 + bitIdx] <== byteBits[x][y][byteIdx][bitIdx];
                }
            }
            
            // Assign to state array
            for (var bitIdx = 0; bitIdx < 64; bitIdx++) {
                stateArray[x][y][bitIdx] <== laneBits[x][y][bitIdx];
            }
        }
    }
}

/**
 * Convert Keccak state array (5x5x64 bits) to 200 bytes
 * Uses little-endian byte ordering for each 64-bit lane
 */
template StateArrayToBytes() {
    signal input {bit} stateArray[5][5][64]; // 5x5 matrix of 64-bit lanes
    signal output {byte} bytes[200]; // 1600-bit state size (200 bytes)
    
    // Convert each 64-bit lane to 8 bytes
    signal byteBits[5][5][8][8];
    for (var y = 0; y < 5; y++) {
        for (var x = 0; x < 5; x++) {
            var laneIndex = y * 5 + x; // Lane index (0-24)
            var byteOffset = laneIndex * 8; // Each lane is 8 bytes
            
            // Group 64 bits into 8 bytes (little-endian)
            for (var byteIdx = 0; byteIdx < 8; byteIdx++) {
                for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
                    byteBits[x][y][byteIdx][bitIdx] <== stateArray[x][y][byteIdx * 8 + bitIdx];
                }
                bytes[byteOffset + byteIdx] <== Bits2Num(8)(byteBits[x][y][byteIdx]);
            }
        }
    }
}

/**
 * Keccak Padding (10*1 pattern)
 * Adds padding to message to make it a multiple of rate bits
 * 
 * @param msgBits - Message length in bits
 * @param rateBits - Rate in bits (1088 for Keccak256)
 */
template Padding(msgBits, rateBits) {
    var numBlocks = ((msgBits + 2) - 1) \ rateBits + 1;
    var totalBits = numBlocks * rateBits;

    signal input {bit} msg[msgBits];
    signal output {bit} paddedMsg[totalBits];
    
    // Copy the original bit
    for (var i = 0; i < msgBits; i++) {
        paddedMsg[i] <== msg[i];
    }

    // First and last padding bit is 1
    paddedMsg[msgBits] <== 1;
    paddedMsg[totalBits - 1] <== 1;
    // Fill middle padding bits with 0
    for (var i = msgBits + 1; i < totalBits - 1; i++) {
        paddedMsg[i] <== 0;
    }
}

/**
 * Keccak Absorb Phase
 * Processes padded input in rate-sized blocks
 * XOR each states with block and apply Keccak-f[1600] permutation
 * 
 * @param msgBits - Message length in bits (including padding)
 * @param rateBits - Rate in bits (1088 for Keccak256)
 */
template Absorb(msgBits, rateBits) {
    assert(msgBits > 0);
    assert(msgBits % rateBits == 0);
    var numBlocks = msgBits \ rateBits;
    
    signal input {bit} msg[msgBits];
    signal output {bit} finalStateArray[5][5][64];
    
    signal blocks[numBlocks][rateBits];
    signal {bit} statesArray[numBlocks + 1][5][5][64];
    signal {bit} xoredStatesArray[numBlocks][5][5][64];

    // Convert message into blocks
    for (var blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
        for (var bitIdx = 0; bitIdx < rateBits; bitIdx++) {
            blocks[blockIdx][bitIdx] <== msg[blockIdx * rateBits + bitIdx];
        }
    }

    // Initial the first state
    for (var x = 0; x < 5; x++) {
        for (var y = 0; y < 5; y++) {
            for (var z = 0; z < 64; z++) {
                statesArray[0][x][y][z] <== 0;
            }
        }
    }
    
    var effectiveNumLanes = rateBits \ 64;
    for (var blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                var laneIdx = 5 * y + x;
                if (laneIdx < effectiveNumLanes) {
                    // Xor state bit with current block bit
                    for (var z = 0; z < 64; z++) {
                        var bitIdx = 64 * laneIdx + z;
                        xoredStatesArray[blockIdx][x][y][z] <== XOR()(statesArray[blockIdx][x][y][z], blocks[blockIdx][bitIdx]);
                    }
                } else {
                    // Copy the previous state
                    xoredStatesArray[blockIdx][x][y] <== statesArray[blockIdx][x][y];
                }
            }
        }
        
        // Apply Keccak-f[1600] permutation
        statesArray[blockIdx + 1] <== KeccakF1600()(xoredStatesArray[blockIdx]);
    }
    
    finalStateArray <== statesArray[numBlocks];
}

/**
 * Keccak Squeeze Phase
 * Extracts hash bits from the final state
 * 
 * @param hashBits - Number of hash bits (256 for Keccak256)
 * @param rateBits - Rate in bits (1088 for Keccak256)
 */
template Squeeze(hashBits, rateBits) {
    var numBlocks = ((hashBits - 1) \ rateBits) + 1;

    signal input {bit} stateArray[5][5][64];
    signal output {bit} hash[hashBits];

    signal {bit} statesArray[numBlocks][5][5][64];
    var effectiveNumLanes = rateBits \ 64;

    for (var blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
        if (blockIdx == 0) {
            // Initialize the first state
            statesArray[0] <== stateArray;
        } else {
            // Calculate the next block
            statesArray[blockIdx] <== KeccakF1600()(statesArray[blockIdx - 1]);
        }
        // Extract hash from the first 17 lanes of each state
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                var laneIdx = x + 5 * y;
                if (laneIdx < effectiveNumLanes) {
                    for (var z = 0; z < 64; z++) {
                        var bitIdx = laneIdx * 64 + z;
                        var hashIdx = blockIdx * rateBits + bitIdx;
                        if (hashIdx < hashBits) {
                            hash[hashIdx] <== statesArray[blockIdx][x][y][z];
                        }
                    }
                }
            }
        }
    }
}

/**
 * Complete Keccak256 Hash Function
 * Combines padding, absorb, and squeeze phases
 *
 * @param msgBytes - Number of message bytes
 */
template Keccak256Hash(msgBytes) {
    signal input msg[msgBytes];
    signal output hash[32];
    
    // Step 1: Add padding
    var rateBytes = 136; // 1088 bits / 8
    component padding = KeccakPaddingVariable(maxInputLength, rateBytes);
    padding.inputBytes <== inputBytes;
    padding.actualLength <== inputLength;
    
    // Step 2: Absorb phase
    var maxBlocks = (maxInputLength + rateBytes + rateBytes - 1) \ rateBytes;
    component absorb = KeccakAbsorb(maxBlocks, rateBytes);
    
    // Initialize state with zeros
    signal initialState[25];
    for (var i = 0; i < 25; i++) {
        initialState[i] <== 0;
    }
    
    absorb.initialState <== initialState;
    for (var i = 0; i < maxBlocks * rateBytes; i++) {
        if (i < maxInputLength + rateBytes) {
            absorb.paddedInput[i] <== padding.paddedBytes[i];
        } else {
            absorb.paddedInput[i] <== 0;
        }
    }
    
    // Step 3: Squeeze phase
    component squeeze = KeccakSqueeze(32, rateBytes);
    squeeze.state <== absorb.finalState;
    hash <== squeeze.hash;
}