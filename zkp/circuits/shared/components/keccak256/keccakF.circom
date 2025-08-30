pragma circom 2.2.2;

include "../arithmetic.circom";
include "../bits.circom";

/**
 * Keccak256 θ (theta) step: Column parity computation
 *
 * XOR each bit in the state with the parities of two neighboring columns
 * Optimized by using modulo arithmetic instead of chained XOR gates
 */
template Theta() {
    signal input {bit} stateArray[5][5][64];
    signal output {bit} newStateArray[5][5][64];

    // Column sum computation: C[x,z] = A[x,0,z] + A[x,1,z] + A[x,2,z] + A[x,3,z] + A[x,4,z]
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
    
    // D computation: D[x,z] = C[(x-1) mod 5, z] + C[(x+1) mod 5, (z-1) mod 64]
    signal D[5][64];
    for (var x = 0; x < 5; x++) {
        for (var z = 0; z < 64; z++) {
            D[x][z] <== C[(x + 4) % 5][z] + C[(x + 1) % 5][(z + 63) % 64];
        }
    }
    
    // A'[x,y,z] = (A[x,y,z] + D[x,z]) mod 2
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

/**
 * Keccak256 ρ (rho) step: Bit rotation
 * 
 * Rotate each lane by a predefined offset amount.
 */
template Rho() {
    signal input {bit} stateArray[5][5][64];
    signal output {bit} newStateArray[5][5][64];

    // ρ (rho) rotation offsets for each position [x][y]
    // Based on the official Keccak specification
    var RHO_OFFSETS[5][5] = [
        [  0,  36,   3, 105, 210],
        [  1, 300,  10,  45,  66],
        [190,   6, 171,  15, 253],
        [ 28,  55, 153,  21, 120],
        [ 91, 276, 231, 136,  78]
    ];

    // Apply rotation to each lane
    for (var x = 0; x < 5; x++) {
        for (var y = 0; y < 5; y++) {
            var offset = RHO_OFFSETS[x][y] % 64;
            for (var z = 0; z < 64; z++) {
                newStateArray[x][y][z] <== stateArray[x][y][(z + 64 - offset) % 64];
            }
        }
    }
}

/**
* Keccak256 π (pi) step: Lane permutation
* 
* Rearranges the 25 lanes according to the formula: (x,y) → ((x + 3*y) % 5, x).
*/
template Pi() {
   signal input {bit} stateArray[5][5][64];
   signal output {bit} newStateArray[5][5][64];

   for (var x = 0; x < 5; x++) {
       for (var y = 0; y < 5; y++) {
           var temp_x = (x + 3 * y) % 5;
           var temp_y = x;
           for (var z = 0; z < 64; z++) {
               newStateArray[x][y][z] <== stateArray[temp_x][temp_y][z];
           }
       }
   }
}