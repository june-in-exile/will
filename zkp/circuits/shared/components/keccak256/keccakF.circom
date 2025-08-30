pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "../bits.circom";

/**
 * Keccak256 Theta Step
 * θ (theta) step: Column parity computation
 * 
 * Input: 25 lanes (64-bit each) representing the 5x5 state matrix
 * Output: 25 lanes after theta transformation
 */
template Theta() {
    signal input {lane} state[25];  // 5x5 state matrix, flattened (row-major)
    signal output {lane} newState[25];
    
    // Column parity computation: C[x] = state[x,0] ⊕ state[x,1] ⊕ state[x,2] ⊕ state[x,3] ⊕ state[x,4]
    signal {lane} C[5];    
    signal {lane} columnValues[5][5];
    for (var x = 0; x < 5; x++) {
        for (var y = 0; y < 5; y++) {
            columnValues[x][y] <== state[y * 5 + x];
        }
        C[x] <== BitwiseXorOptimized(5,64)(columnValues[x]); // 384 * 5 = 1920
    }
    
    // D computation: D[x] = C[(x+4) mod 5] ⊕ ROT(C[(x+1) mod 5], 1)
    signal {lane} D[5];
    signal {lane} rotatedC[5];
    
    for (var x = 0; x < 5; x++) {
        rotatedC[x] <== RotateLeft(64, 1)(C[(x + 1) % 5]);
        D[x] <== BitwiseXor(2,64)([C[(x + 4) % 5], rotatedC[x]]); // 192 * 5 = 960
    }

    // Apply theta transformation: state[y][x] = state[y][x] ⊕ D[x]
    for (var y = 0; y < 5; y++) {
        for (var x = 0; x < 5; x++) {
            newState[y * 5 + x] <== BitwiseXor(2,64)([state[y * 5 + x], D[x]]); // 192 * 25 = 4800
        }
    }
}

/**
 * Optimized version that uses modulo arithmetic instead of chained XOR gates for better efficiency
 */
template ThetaOptimized() {
    signal input {lane} state[25];  // 5x5 state matrix, flattened (row-major)
    signal output {lane} newState[25];

    signal {bit} stateBits[25][64];
    for (var i = 0; i < 25; i++) {
        stateBits[i] <== Num2Bits(64)(state[i]);
    }

    // Column parity computation: C[x] = state[x,0] ⊕ state[x,1] ⊕ state[x,2] ⊕ state[x,3] ⊕ state[x,4]
    signal C[5][64];
    signal columnValues[5][64][5];
    for (var x = 0; x < 5; x++) {
        for (var z = 0; z < 64; z++) {
            columnValues[x][z][0] <== stateBits[x][z];
            for (var y = 1; y < 5; y++) {
                columnValues[x][z][y] <== columnValues[x][z][y - 1] + stateBits[y * 5 + x][z];
            }
            C[x][z] <== columnValues[x][z][4];
        }
    }
    
    // D computation: D[x] = C[(x+4) mod 5] ⊕ ROT(C[(x+1) mod 5], 1)
    signal D[5][64];
    signal rotatedC[5][64];
    for (var x = 0; x < 5; x++) {
        for (var z = 0; z < 64; z++) {
            D[x][z] <== C[(x + 4) % 5][z] + C[(x + 1) % 5][(z + 63) % 64];
        }
    }

    // Apply theta transformation: state[y][x] = state[y][x] ⊕ D[x]
    signal newStateSums[25][64];
    signal {bit} newStateBits[25][64];
    for (var y = 0; y < 5; y++) {
        for (var x = 0; x < 5; x++) {
            for (var z = 0; z < 64; z++) {
                newStateSums[y * 5 + x][z] <== stateBits[y * 5 + x][z] + D[x][z];
                newStateBits[y * 5 + x][z] <== Mod2()(newStateSums[y * 5 + x][z]);
            }
            newState[y * 5 + x] <== Bits2Num(64)(newStateBits[y * 5 + x]);
        }
    }
}

template ThetaStateArray() {
    signal input {bit} stateArray[5][5][64]; // 5x5 matrix of 64-bit lanes
    signal output {bit} newStateArray[5][5][64];

    // Column parity computation: C[x] = state[x,0] ⊕ state[x,1] ⊕ state[x,2] ⊕ state[x,3] ⊕ state[x,4]
    signal C[5][64];
    signal columnValues[5][64][5];
    for (var x = 0; x < 5; x++) {
        for (var z = 0; z < 64; z++) {
            columnValues[x][z][0] <== stateArray[x][0][z];
            for (var y = 1; y < 5; y++) {
                columnValues[x][z][y] <== columnValues[x][z][y - 1] + stateBits[x][y][z];
            }
            C[x][z] <== columnValues[x][z][4];
        }
    }
    
    // D computation: D[x] = C[(x+4) mod 5] ⊕ ROT(C[(x+1) mod 5], 1)
    signal D[5][64];
    signal rotatedC[5][64];
    for (var x = 0; x < 5; x++) {
        for (var z = 0; z < 64; z++) {
            D[x][z] <== C[(x + 4) % 5][z] + C[(x + 1) % 5][(z + 63) % 64];
        }
    }

    // Apply theta transformation: state[y][x] = state[y][x] ⊕ D[x]
    signal newStateSums[25][64];
    signal {bit} newStateBits[25][64];
    for (var y = 0; y < 5; y++) {
        for (var x = 0; x < 5; x++) {
            for (var z = 0; z < 64; z++) {
                newStateSums[y * 5 + x][z] <== stateBits[y * 5 + x][z] + D[x][z];
                newStateBits[y * 5 + x][z] <== Mod2()(newStateSums[y * 5 + x][z]);
            }
            newState[y * 5 + x] <== Bits2Num(64)(newStateBits[y * 5 + x]);
        }
    }
}