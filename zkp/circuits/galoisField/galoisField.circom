pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "../shared/components/arithmetic.circom";
include "../shared/components/bits.circom";

/**
 * Optimized Galois Field multiplication in GF(2^128)
 * Reduction polynomial: x^128 + x^7 + x^2 + x + 1
 * 
 * This implementation uses a three-round approach to handle overflows efficiently:
 * - Round 1: Calculate initial multiplication with first-level overflows
 * - Round 2: Process first-level overflows with reduction polynomial
 * - Round 3: Process remaining second-level overflows
 * 
 * The key optimization is accumulating contributions instead of iterative XOR operations,
 * which significantly reduces the number of constraints.
 */
template GF128MultiplyOptimized_() {
    signal input {byte} aBytes[16];
    signal input {byte} bBytes[16];
    signal output {byte} cBytes[16];
    
    // Bit representations
    signal aBitGroup[16][8];
    signal bBitGroup[16][8];
    signal cBitGroup[16][8];
    signal aBits[128];
    signal bBits[128];
    signal cBits[128];
    
    // Convert 16-byte inputs to 128-bit representation
    for (var byte = 0; byte < 16; byte++) {
        // Convert bytes to bits (MSB first within each byte)
        aBitGroup[byte] <== Num2Bits(8)(aBytes[byte]);
        bBitGroup[byte] <== Num2Bits(8)(bBytes[byte]);
        
        // Rearrange to LSB-first bit ordering for the entire 128-bit value
        for (var bit = 0; bit < 8; bit++) {
            aBits[byte * 8 + bit] <== aBitGroup[byte][7 - bit];
            bBits[byte * 8 + bit] <== bBitGroup[byte][7 - bit];
        }
    }

    // Reduction polynomial coefficients: 1 + x + x^2 + x^7
    var p_x[4] = [0, 1, 2, 7];

    // Counter arrays for accumulating contributions
    signal counter1[128][128];  // Round 1: main multiplication
    signal counter2[4][127];    // Round 2: first overflow processing
    signal counter3[4][6];      // Round 3: second overflow processing

    // Valid bits that fit within 128-bit result
    signal valid1[128];
    signal valid2[128];
    signal valid3[13];  // Only bits 0-12 can have contributions from round 3

    // Overflow bits that need reduction
    signal overflow1[127];  // Maximum 127 overflow bits from round 1
    signal overflow2[6];    // Maximum 6 overflow bits from round 2

    // ===== Round 1: Main multiplication =====
    // For each bit of 'a', accumulate b shifted right by that bit position
    for (var aBit = 0; aBit < 128; aBit++) {
        for (var bBit = 0; bBit < 128; bBit++) {
            var prevBBit = bBit + 1;
            
            // Base case: first a-bit or no previous b-bit to carry
            if (aBit == 0 || prevBBit >= 128) {
                counter1[aBit][bBit] <== aBits[aBit] * bBits[bBit];
            } else {
                // Accumulate: current contribution + carried value from previous iteration
                counter1[aBit][bBit] <== counter1[aBit - 1][prevBBit] + aBits[aBit] * bBits[bBit];
            }
        }
    }

    // Extract valid bits (0-127) and overflow bits (128+) from round 1
    for (var i = 0; i < 128; i++) {
        valid1[i] <== counter1[i][0];  // Bits that fit in result

        if (i < 127) {
            overflow1[i] <== counter1[127][i + 1];  // Bits that overflow (128+)
        }
    }

    // ===== Round 2: Process first-level overflows =====
    // Apply reduction polynomial to overflow bits from round 1
    for (var pIdx = 0; pIdx < 4; pIdx++) {
        for (var over1Bit = 0; over1Bit < 127; over1Bit++) {
            if (pIdx == 0) {
                // Initialize with overflow values
                counter2[pIdx][over1Bit] <== overflow1[over1Bit];
            } else {
                // Calculate previous overflow bit position based on polynomial terms
                var prevOver1Bit = over1Bit + (p_x[pIdx] - p_x[pIdx - 1]);
                if (prevOver1Bit < 127) {
                    // Accumulate from previous polynomial term
                    counter2[pIdx][over1Bit] <== counter2[pIdx - 1][prevOver1Bit] + overflow1[over1Bit];
                } else {
                    // No previous term to accumulate
                    counter2[pIdx][over1Bit] <== overflow1[over1Bit];
                }
            }
        }
    }
    
    // Extract contributions to valid bits and remaining overflows from round 2
    for (var i = 0; i < 128; i++) {
        // Determine which polynomial term contributes to this bit position
        if (i < p_x[1]) {
            valid2[i] <== counter2[0][i - p_x[0]];
        } else if (i < p_x[2]) {
            valid2[i] <== counter2[1][i - p_x[1]];
        } else if (i < p_x[3]) {
            valid2[i] <== counter2[2][i - p_x[2]];
        } else {
            valid2[i] <== counter2[3][i - p_x[3]];
        }

        // Extract remaining overflow bits (only 6 possible)
        if (i < 6) {
            overflow2[i] <== counter2[3][i + 121];  // 128 - 7 = 121
        }
    }

    // ===== Round 3: Process second-level overflows =====
    // Apply reduction polynomial to remaining overflow bits
    for (var pIdx = 0; pIdx < 4; pIdx++) {
        for (var over2Bit = 0; over2Bit < 6; over2Bit++) {
            if (pIdx == 0) {
                counter3[pIdx][over2Bit] <== overflow2[over2Bit];
            } else {
                var prevOver2Bit = over2Bit + (p_x[pIdx] - p_x[pIdx - 1]);
                if (prevOver2Bit < 6) {
                    counter3[pIdx][over2Bit] <== counter3[pIdx - 1][prevOver2Bit] + overflow2[over2Bit];
                } else {
                    counter3[pIdx][over2Bit] <== overflow2[over2Bit];
                }
            }
        }
    }
    
    // Extract final contributions from round 3 (only affects bits 0-12)
    for (var i = 0; i < 13; i++) {
        if (i < p_x[1]) {
            valid3[i] <== counter3[0][i - p_x[0]];
        } else if (i < p_x[2]) {
            valid3[i] <== counter3[1][i - p_x[1]];
        } else if (i < p_x[3]) {
            valid3[i] <== counter3[2][i - p_x[2]];
        } else {
            valid3[i] <== counter3[3][i - p_x[3]];
        }
    }

    // ===== Final step: Sum all contributions and reduce modulo 2 =====
    signal validSum[128];
    for (var cBit = 0; cBit < 128; cBit++) {
        if (cBit < 13) {
            // Bits 0-12 can have contributions from all three rounds
            validSum[cBit] <== valid1[cBit] + valid2[cBit] + valid3[cBit];
        } else {
            // Bits 13-127 only have contributions from rounds 1 and 2
            validSum[cBit] <== valid1[cBit] + valid2[cBit];
        }
        // Reduce modulo 2 to get final bit value (implements XOR of all contributions)
        cBits[cBit] <== Mod2()(validSum[cBit]);
    }
    
    // Convert final 128-bit result back to bytes
    for (var byte = 0; byte < 16; byte++) {
        // Reverse bit order within each byte (LSB-first to MSB-first)
        for (var bit = 0; bit < 8; bit++) {
            cBitGroup[byte][7 - bit] <== cBits[byte * 8 + bit];
        }
        // Convert 8 bits back to byte value
        cBytes[byte] <== Bits2Num(8)(cBitGroup[byte]);
    }
}

/**
 * Bit Array Mapping:
 * - bits[0] = x^0 coefficient → bytes[0] bit 7
 * - bits[1] = x^1 coefficient → bytes[0] bit 6
 * - ...
 * - bits[7] = x^7 coefficient → bytes[0] bit 0
 * - bits[8] = x^8 coefficient → bytes[1] bit 7
 * - ...
 * - bits[127] = x^127 coefficient → bytes[15] bit 0
 * 
 * Example:
 * - Input bytes[0] = 0x80 (10000000₂) → bits[0-7] = [1,0,0,0,0,0,0,0]
 * - Input bytes[0] = 0x01 (00000001₂) → bits[0-7] = [0,0,0,0,0,0,0,1]
 */
template GF128BytesToBits() {
    signal input {byte} bytes[16];
    signal output {bit} bits[128];
    
    component byteToBits[16];
    
    for (var byteIdx = 0; byteIdx < 16; byteIdx++) {
        byteToBits[byteIdx] = Num2Bits(8);
        byteToBits[byteIdx].in <== bytes[byteIdx];
        
        for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
            bits[byteIdx * 8 + bitIdx] <== byteToBits[byteIdx].out[7 - bitIdx];
        }
    }
}

/**
 * Bit Array Mapping:
 * - bits[0] = x^0 coefficient → bytes[0] bit 7
 * - bits[1] = x^1 coefficient → bytes[0] bit 6
 * - ...
 * - bits[7] = x^7 coefficient → bytes[0] bit 0
 * - bits[8] = x^8 coefficient → bytes[1] bit 7
 * - ...
 * - bits[127] = x^127 coefficient → bytes[15] bit 0
 * 
 * Example:
 * - Input bits[0-7] = [1,0,0,0,0,0,0,0] → bytes[0] = 0x80 (10000000₂)
 * - Input bits[0-7] = [0,0,0,0,0,0,0,1] → bytes[0] = 0x01 (00000001₂)
 */
template GF128BitsToBytes() {
    signal input {bit} bits[128];
    signal output {byte} bytes[16];
    
    component bitsToBytes[16];
    
    for (var byteIdx = 0; byteIdx < 16; byteIdx++) {
        bitsToBytes[byteIdx] = Bits2Num(8);
        
        for (var bitIdx = 0; bitIdx < 8; bitIdx++) {
            bitsToBytes[byteIdx].in[7 - bitIdx] <== bits[byteIdx * 8 + bitIdx];
        }
        
        bytes[byteIdx] <== bitsToBytes[byteIdx].out;
    }
}

template GF128MultiplyOptimized() {
    signal input {byte} aBytes[16];
    signal input {byte} bBytes[16];
    signal output {byte} cBytes[16];
    
    signal {bit} aBits[128];
    signal {bit} bBits[128];
    signal {bit} cBits[128];

    // Reduction polynomial coefficients: 1 + x + x^2 + x^7
    var p_x[4] = [0, 1, 2, 7];

    // Counter arrays for accumulating contributions
    signal counter1[128][128];
    signal counter2[4][127];    // Maximum 127 overflow bits from round 1
    signal counter3[4][6];      // Maximum 6 overflow bits from round 2

    // Convert 16-byte a, b to 128-bit
    aBits <== GF128BytesToBits()(aBytes);
    bBits <== GF128BytesToBits()(bBytes);

    // ===== Round 1: Main multiplication =====
    // For each bit of 'a', accumulate b shifted right by that bit position
    for (var aBit = 0; aBit < 128; aBit++) {
        for (var bBit = 0; bBit < 128; bBit++) {
            var prevBBit = bBit + 1;
            // Base case: first a-bit or no previous b-bit to carry
            if (aBit == 0 || prevBBit >= 128) {
                counter1[aBit][bBit] <== aBits[aBit] * bBits[bBit];
            } else {
                // Accumulate: current contribution + carried value from previous iteration
                counter1[aBit][bBit] <== counter1[aBit - 1][prevBBit] + aBits[aBit] * bBits[bBit];
            }
        }
    }

    // ===== Round 2: Process first-level overflows =====
    // Initialize with overflow bits (128+) from round 1
    for (var i = 0; i < 127; i++) {
        counter2[0][i] <== counter1[127][i + 1];
    }

    // Apply reduction polynomial to overflow bits from round 1
    for (var pIdx = 1; pIdx < 4; pIdx++) {
        // Accumulate from previous polynomial term if it exists
        var offset = p_x[pIdx] - p_x[pIdx - 1];
        for (var bit = 0; bit < 127; bit++) {
            var prevTerm = (bit < 127 - offset) ? counter2[pIdx - 1][bit + offset] + counter2[0][bit] : counter2[0][bit];
            counter2[pIdx][bit] <== prevTerm;
        }
    }

    // ===== Round 3: Process second-level overflows =====
    // Initialize with overflow bits (128+) from round 2
    for (var i = 0; i < 6; i++) {
        counter3[0][i] <== counter2[3][i + (128 - 7)];
    }

    // Apply reduction polynomial to remaining overflow bits
    for (var pIdx = 1; pIdx < 4; pIdx++) {
        // Accumulate from previous polynomial term if it exists
        var offset = p_x[pIdx] - p_x[pIdx - 1];
        for (var bit = 0; bit < 6; bit++) {
            var prevTerm = (bit < 6 - offset) ? counter3[pIdx - 1][bit + offset] + counter3[0][bit] : counter3[0][bit];
            counter3[pIdx][bit] <== prevTerm;
        }
    }
    
    // ===== Final step: Sum all contributions and reduce modulo 2 =====
    for (var cBit = 0, contribution1, contribution2, contribution3; cBit < 128; cBit++) {
        contribution1 = counter1[cBit][0];
        if (cBit < p_x[1]) {
            (contribution2, contribution3) = (counter2[0][cBit - p_x[0]], counter3[0][cBit - p_x[0]]);
        } else if (cBit < p_x[2]) {
            (contribution2, contribution3) = (counter2[1][cBit - p_x[1]], counter3[1][cBit - p_x[1]]);
        } else if (cBit < p_x[3]) {
            (contribution2, contribution3) = (counter2[2][cBit - p_x[2]], counter3[2][cBit - p_x[2]]);
        } else {
            // Only bits 0-12 can have contributions from round 3
            (contribution2, contribution3) = (counter2[3][cBit - p_x[3]], (cBit < 13) ? counter3[3][cBit - p_x[3]] : 0);
        }
        cBits[cBit] <== Mod2()(contribution1 + contribution2 + contribution3);
    }

    // Convert final result bits back to bytes
    cBytes <== GF128BitsToBytes()(cBits);
}

/**
 * GHASH function for AES-GCM
 * Processes fixed-length input (must be padded to multiple of 16 bytes)
 */
template GHash(numBlocks) {
    signal input {byte} data[numBlocks * 16];
    signal input {byte} hashKey[16];
    signal output {byte} result[16];
    
    // Intermediate results for each block
    signal {byte} intermediateResults[numBlocks + 1][16];
    
    // Initialize with zeros
    for (var i = 0; i < 16; i++) {
        intermediateResults[0][i] <== 0;
    }
    
    // Process each 16-byte block
    component gf128Multiply[numBlocks];
    signal {byte} xorResult[numBlocks][16];
    for (var block = 0; block < numBlocks; block++) {
        // XOR current result with data block
        for (var i = 0; i < 16; i++) {
            xorResult[block][i] <== BitwiseXor(2,8)([intermediateResults[block][i],data[block * 16 + i]]);
        }
        
        // Multiply by hashKey in GF(2^128)
        intermediateResults[block + 1] <== GF128MultiplyOptimized()(xorResult[block],hashKey);
    }
    
    // Output final result
    result <== intermediateResults[numBlocks];
}


// Auto updated: 2025-07-16T19:27:52.334Z
template UntaggedGF128MultiplyOptimized() {
    signal input aBytes[16];
    signal input bBytes[16];
    signal output {byte} cBytes[16];

    signal {byte} _aBytes[16];
    _aBytes <== aBytes;
    signal {byte} _bBytes[16];
    _bBytes <== bBytes;

    cBytes <== GF128MultiplyOptimized()(_aBytes, _bBytes);
}

component main = UntaggedGF128MultiplyOptimized();
