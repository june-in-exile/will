pragma circom 2.2.2;

include "keyExpansion.circom";
include "roundKeyAddition.circom";
include "byteSubstitution.circom";
include "rowShifting.circom";
include "columnMixing.circom";
include "../bus.circom";
include "../bits.circom";

/**
 * AES Block Encryption Circuit
 * Implements the AES encryption algorithm for 128/192/256-bit keys
 * Following NIST FIPS 197 standard
 * 
 * @param keyBits - Key size in bits (128, 192, or 256)
 */
template EncryptBlock(keyBits) {
    var (Nk, Nr);
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        (Nk, Nr) = (4,10);
    } else if (keyBits == 192) {
        (Nk, Nr) = (6,12);
    } else {
        (Nk, Nr) = (8,14);
    }
    var expandedNk = 4 * (Nr + 1);
    
    signal input {byte} plaintext[16];
    input Word() key[Nk];
    signal output {byte} ciphertext[16];
    
    // Expand the key
    Word() roundKey[expandedNk] <== ExpandKey(keyBits)(key);

    // Group by 4 words for each round
    Word() roundKeyGroup[Nr + 1][4];
    for (var i = 0; i <= Nr; i++) {
        for (var j = 0; j < 4; j++) {
            roundKeyGroup[i][j] <== roundKey[4 * i + j];
        }
    }
    
    // State array to track transformations
    signal {byte} state[Nr][16];

    // Intermediate signals for each transformation step
    signal {byte} byteSubstituted[Nr][16];
    signal {byte} rowShifted[Nr][16];
    signal {byte} columnMixed[Nr - 1][16]; // No MixColumns in final round

    // Initial round - AddRoundKey only
    state[0] <== AddRoundKey()(plaintext,roundKeyGroup[0]);

    // Main rounds (1 to Nr-1): SubBytes -> ShiftRows -> MixColumns -> AddRoundKey
    for (var round = 1; round <= Nr - 1; round++) {
        byteSubstituted[round - 1] <== SubBytes()(state[round - 1]);
        rowShifted[round - 1] <== ShiftRows()(byteSubstituted[round - 1]);
        columnMixed[round - 1] <== MixColumns()(rowShifted[round - 1]);
        state[round] <== AddRoundKey()(columnMixed[round - 1],roundKeyGroup[round]);
    }
    
    // Final round (no MixColumns)
    byteSubstituted[Nr - 1] <== SubBytes()(state[Nr - 1]);
    rowShifted[Nr - 1] <== ShiftRows()(byteSubstituted[Nr - 1]);
    ciphertext <== AddRoundKey()(rowShifted[Nr - 1],roundKeyGroup[Nr]);
}