pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
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
    var numBlocks = ((msgBits + 2) + rateBits - 1) \ rateBits;
    var totalBits = numBlocks * rateBits;
    var paddingZeroBits = totalBits - msgBits - 2;

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


// test case:
// rateBits = 1088
// maxInputBits = 0
// maxInputBits = 1088
// maxInputBits = 1087
// maxInputBits = 1086
// maxInputBits = 544
// maxInputBits = 1632


/**
 * Keccak Absorb Phase
 * Processes padded input in rate-sized blocks
 * 
 * @param numBlocks - Number of blocks to process
 * @param rateBytes - Rate in bits (1088 for Keccak256)
 */
// template Absorb(numBlocks, rateBits) {
//     signal input {bit} paddedInput[numBlocks][rateBits];
//     signal output {bit} newStateArray[5][5][64];
    
//     signal {bit} statesArray[numBlocks + 1][5][5][64];
//     for (var x = 0; x < 5; x++) {
//         for (var y = 0; y < 5; y++) {
//             for (var z = 0; z < 64; z++) {
//                 statesArray[0][x][y][z] = 0;
//             }
//         }
//     }
    
//     for (var block = 0; block < numBlocks; block++) {
//         // Convert current block to lanes
//         signal blockLanes[17]; // Only first 17 lanes are affected by rate
        
//         for (var laneIdx = 0; laneIdx < 17; laneIdx++) {
//             var byteOffset = block * rateBytes + laneIdx * 8;
            
//             // Convert 8 bytes to 64-bit lane (little-endian)
//             signal laneBytes[8];
//             for (var i = 0; i < 8; i++) {
//                 if (byteOffset + i < numBlocks * rateBytes) {
//                     laneBytes[i] <== paddedInput[byteOffset + i];
//                 } else {
//                     laneBytes[i] <== 0;
//                 }
//             }
            
//             // Convert bytes to 64-bit value (little-endian)
//             signal powers[8];
//             powers[0] <== 1;
//             for (var i = 1; i < 8; i++) {
//                 powers[i] <== powers[i-1] * 256;
//             }
            
//             signal contributions[8];
//             for (var i = 0; i < 8; i++) {
//                 contributions[i] <== laneBytes[i] * powers[i];
//             }
            
//             signal partialSums[7];
//             partialSums[0] <== contributions[0] + contributions[1];
//             for (var i = 1; i < 7; i++) {
//                 partialSums[i] <== partialSums[i-1] + contributions[i+1];
//             }
            
//             blockLanes[laneIdx] <== partialSums[6];
//         }
        
//         // XOR with state
//         signal xoredState[25];
//         for (var i = 0; i < 17; i++) {
//             xoredState[i] <== states[block][i] ^ blockLanes[i];
//         }
//         for (var i = 17; i < 25; i++) {
//             xoredState[i] <== states[block][i];
//         }
        
//         // Apply Keccak-f permutation (placeholder - needs full implementation)
//         states[block + 1] <== KeccakF()(xoredState);
//     }
    
//     finalState <== states[numBlocks];
// }

// /**
//  * Keccak Squeeze Phase
//  * Extracts output bytes from the final state
//  * 
//  * @param outputBytes - Number of output bytes (32 for Keccak256)
//  * @param rateBytes - Rate in bytes (136 for Keccak256)
//  */
// template KeccakSqueeze(outputBytes, rateBytes) {
//     signal input state[25];
//     signal output hash[outputBytes];
    
//     // For Keccak256, we only need 32 bytes, which fits in the first squeeze
//     // More complex implementation would handle multiple squeeze rounds
    
//     // Extract bytes from first 17 lanes (rate portion)
//     var bytesExtracted = 0;
    
//     for (var laneIdx = 0; laneIdx < 17 && bytesExtracted < outputBytes; laneIdx++) {
//         // Convert 64-bit lane to 8 bytes (little-endian)
//         signal laneBits[64];
//         laneBits <== Num2Bits(64)(state[laneIdx]);
        
//         for (var byteIdx = 0; byteIdx < 8 && bytesExtracted < outputBytes; byteIdx++) {
//             signal byteBits[8];
//             for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
//                 byteBits[bitIdx] <== laneBits[byteIdx * 8 + bitIdx];
//             }
            
//             hash[bytesExtracted] <== Bits2Num(8)(byteBits);
//             bytesExtracted++;
//         }
//     }
// }

// /**
//  * Complete Keccak256 Hash Function
//  * Combines padding, absorb, and squeeze phases
//  */
// template Keccak256Hash(maxInputLength) {
//     signal input inputBytes[maxInputLength];
//     signal input inputLength;
//     signal output hash[32];
    
//     // Step 1: Add padding
//     var rateBytes = 136; // 1088 bits / 8
//     component padding = KeccakPaddingVariable(maxInputLength, rateBytes);
//     padding.inputBytes <== inputBytes;
//     padding.actualLength <== inputLength;
    
//     // Step 2: Absorb phase
//     var maxBlocks = (maxInputLength + rateBytes + rateBytes - 1) \ rateBytes;
//     component absorb = KeccakAbsorb(maxBlocks, rateBytes);
    
//     // Initialize state with zeros
//     signal initialState[25];
//     for (var i = 0; i < 25; i++) {
//         initialState[i] <== 0;
//     }
    
//     absorb.initialState <== initialState;
//     for (var i = 0; i < maxBlocks * rateBytes; i++) {
//         if (i < maxInputLength + rateBytes) {
//             absorb.paddedInput[i] <== padding.paddedBytes[i];
//         } else {
//             absorb.paddedInput[i] <== 0;
//         }
//     }
    
//     // Step 3: Squeeze phase
//     component squeeze = KeccakSqueeze(32, rateBytes);
//     squeeze.state <== absorb.finalState;
//     hash <== squeeze.hash;
// }