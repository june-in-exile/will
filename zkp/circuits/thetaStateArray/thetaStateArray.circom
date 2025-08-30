pragma circom 2.2.2;

include "../shared/components/arithmetic.circom";
include "../shared/components/bits.circom";

template ThetaStateArray() {
    signal input {bit} stateArray[5][5][64]; // 5x5 matrix of 64-bit lanes
    signal output {bit} newStateArray[5][5][64];

    // Column parity computation: C[x] = state[x,0] ⊕ state[x,1] ⊕ state[x,2] ⊕ state[x,3] ⊕ state[x,4]
    signal C[5][64];
    signal columnValues[5][64][5];
    for (var x = 0; x < 5; x++) {
        for (var z = 0; z < 64; z++) {
            for (var y = 0; y < 5; y++) {
                columnValues[x][z][y] <== stateArray[x][y][z];
            }
            C[x][z] <== Sum(5)(columnValues[x][z]);
        }
    }
    
    // D computation: D[x] = C[(x+4) mod 5] ⊕ ROT(C[(x+1) mod 5], 1)
    signal D[5][64];
    for (var x = 0; x < 5; x++) {
        for (var z = 0; z < 64; z++) {
            D[x][z] <== C[(x + 4) % 5][z] + C[(x + 1) % 5][(z + 63) % 64];
        }
    }

    // Apply theta transformation: state[y][x] = state[y][x] ⊕ D[x]
    signal sums[5][5][64];
    for (var x = 0; x < 5; x++) {
        for (var y = 0; y < 5; y++) {
            for (var z = 0; z < 64; z++) {
                sums[x][y][z] <== stateArray[x][y][z] + D[x][z];
                newStateArray[x][y][z] <== Mod2()(sums[x][y][z]);
            }
        }
    }
}

// Auto updated: 2025-08-30T03:46:59.234Z
template UntaggedThetaStateArray() {
    signal input stateArray[5][5][64];
    signal output {bit} newStateArray[5][5][64];

    signal {bit} _stateArray[5][5][64];
    _stateArray <== stateArray;

    component thetastatearrayComponent = ThetaStateArray();
    thetastatearrayComponent.stateArray <== _stateArray;
    newStateArray <== thetastatearrayComponent.newStateArray;
}

component main = UntaggedThetaStateArray();
