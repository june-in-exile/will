pragma circom 2.2.2;

include "keyExpansion.circom";
include "roundKeyAddition.circom";
include "byteSubstitution.circom";
include "rowShifting.circom";
include "columnMixing.circom";
include "../bus.circom";
include "../bits.circom";

template EncryptBlock(keyBits) {
    var (Nk, Nb, Nr);
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        (Nk, Nb, Nr) = (4,4,10);
    } else if (keyBits == 192) {
        (Nk, Nb, Nr) = (6,4,12);
    } else {
        (Nk, Nb, Nr) = (8,4,14);
    }
    var expandedNk = 4 * (Nr + 1);
    
    signal input {byte} plaintext[16];
    input Word() key[Nk];
    signal output {byte} ciphertext[16];
    
    // Expand the key
    Word() roundKey[expandedNk] <== ExpandKey(keyBits)(key);
    Word() roundKeyGroup[Nr + 1][4];
    for (var i = 0; i <= Nr; i++) {
        (roundKeyGroup[i][0],roundKeyGroup[i][1],roundKeyGroup[i][2],roundKeyGroup[i][3]) <== (roundKey[4 * i],roundKey[4 * i + 1],roundKey[4 * i + 2],roundKey[4 * i + 3]);
    }
    
    // State array to track transformations
    signal {byte} state[Nr][16];
    
    // Initial round - AddRoundKey only
    state[0] <== AddRoundKey()(plaintext,roundKeyGroup[0]);
    
    // Main rounds (1 to Nr-1)
    signal {byte} byteSubstituted[Nr][16];
    signal {byte} rowShifted[Nr][16];
    signal {byte} columnMixed[Nr - 1][16]; // No MixColumns in final round

    for (var round = 1; round <= Nr - 1; round++) {
        // SubBytes
        byteSubstituted[round - 1] <== SubBytes()(state[round - 1]);
        
        // ShiftRows
        rowShifted[round - 1] <== ShiftRows()(byteSubstituted[round - 1]);
        
        // MixColumns
        columnMixed[round - 1] <== MixColumns()(rowShifted[round - 1]);
        
        // AddRoundKey
        state[round] <== AddRoundKey()(columnMixed[round - 1],roundKeyGroup[round]);
    }
    
    // Final round (no MixColumns)
    // SubBytes
    byteSubstituted[Nr - 1] <== SubBytes()(state[Nr - 1]);
    
    // ShiftRows
    rowShifted[Nr - 1] <== ShiftRows()(byteSubstituted[Nr - 1]);
    
    // AddRoundKey
    ciphertext <== AddRoundKey()(rowShifted[Nr - 1],roundKeyGroup[Nr]);
}