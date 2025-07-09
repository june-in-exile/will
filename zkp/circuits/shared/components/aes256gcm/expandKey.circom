pragma circom 2.2.2;

include "circomlib/circuits/gates.circom";
include "circomlib/circuits/multiplexer.circom";
include "substituteBytes.circom";

template RotWord() {
    signal input {word} in[4];
    signal output {word} out[4];
    
    for (var i = 0; i < 4; i++) {
        out[i] <== in[(i + 1) % 4];
    }
}

template XORWord() {
    signal input {word} a[4];
    signal input {word} b[4];
    signal output {word} out[4];
    
    for (var i = 0; i < 4; i++) {
        out[i] <== XOR()(a[i],b[i]);
    }
}

template RCon() {
    signal input round;
    signal output {byte} out;

    var wIn = 1, nIn = 14;

    signal roundConstants[nIn][wIn] <== [
        [0x01],[0x02],[0x04],[0x08],
        [0x10],[0x20],[0x40],[0x80],
        [0x1b],[0x36],[0x6c],[0xd8],
        [0xab],[0x4d]
    ];
    
    signal outs[wIn] <== Multiplexer(wIn,nIn)(roundConstants,round);
    out <== outs[0];
}

template ExpandKey() {
    signal input {byte} key[32];
    signal output {byte} expandedKey[240];
    
    // Copy original key to first 32 bytes of expanded key
    for (var i = 0; i < 32; i++) {
        expandedKey[i] <== key[i];
    }
    
    // Key expansion loop
    signal {word} prevWords[208][4];
    signal {word} rotatedWords[208][4];
    signal {word} substitutedWords[208][4];
    signal {byte} roundConstants[208];
    signal {word} rconWords[208][4];
    signal {word} newWords[208][4];
    signal {word} prevRoundWords[208][4];
    signal {word} finalWords[208][4];

    for (var i = 32; i < 240; i += 4) {
        // Get previous word
        for (var j = 0; j < 4; j++) {
            prevWords[i-32][j] <== expandedKey[i - 4 + j];
        }
        
        // Check if special processing is needed
        if (i % 32 == 0) {
            // Every 8 words perform rotation and substitution, and xor with round constant

            // Rotation
            rotatedWords[i-32] <== RotWord()(prevWords[i-32]);

            // Substitution
            substitutedWords[i-32] <== SubWord()(rotatedWords[i-32]);

            // Xor with [round constant, 0, 0, 0]
            roundConstants[i-32] <== RCon()((i \ 32) - 1);
            rconWords[i-32] <== [roundConstants[i-32], 0x00, 0x00 , 0x00];
            newWords[i-32] <== XORWord()(substitutedWords[i-32],rconWords[i-32]);
        } else if (i % 32 == 16) {
            // At byte 16 of every 32 bytes, perform substitution
            newWords[i-32] <== SubWord()(prevWords[i-32]);
        } else {
            // Other cases, direct copy
            newWords[i-32] <== prevWords[i-32];
        }
        
        // XOR with corresponding word from previous round
        for (var j = 0; j < 4; j++) {
            prevRoundWords[i-32][j] <== expandedKey[i - 32 + j];
        }
        finalWords[i-32] <== XORWord()(newWords[i-32],prevRoundWords[i-32]);

        // Write final result to expanded key
        for (var j = 0; j < 4; j++) {
            expandedKey[i + j] <== finalWords[i-32][j];
        }
    }
}