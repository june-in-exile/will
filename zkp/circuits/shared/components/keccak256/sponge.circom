pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
// include "../bits.circom";

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

template Pad() {
}

template Absorb() {
}

template Squeeze() {
}