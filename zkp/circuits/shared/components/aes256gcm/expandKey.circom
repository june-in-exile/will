pragma circom 2.2.2;

include "circomlib/circuits/gates.circom";
include "circomlib/circuits/multiplexer.circom";
include "substituteBytes.circom";
include "../bits.circom";

template RotWord() {
    input Word() in;
    output Word() out;
    
    for (var i = 0; i < 4; i++) {
        out.bytes[i] <== in.bytes[(i + 1) % 4];
    }
}

template XORWord() {
    input Word() a;
    input Word() b;
    output Word() c;
    
    signal _a[4] <== a.bytes;
    signal _b[4] <== b.bytes;
    for (var i = 0; i < 4; i++) {
        c.bytes[i] <== BitwiseXor(8)(_a[i],_b[i]);
    }
}

template RCon() {
    signal input round;
    signal output {byte} out;

    var wIn = 1, nIn = 14;

    var roundConstants[nIn][wIn] = [
        [0x01],[0x02],[0x04],[0x08],
        [0x10],[0x20],[0x40],[0x80],
        [0x1b],[0x36],[0x6c],[0xd8],
        [0xab],[0x4d]
    ];
    
    signal outs[wIn] <== Multiplexer(wIn,nIn)(roundConstants,round);
    out <== outs[0];
}

template ExpandKey() {
    input Word() key[8];
    output Word() expandedKey[60];
    
    // Copy original key to first 8 words of expanded key
    for (var i = 0; i < 8; i++) {
        expandedKey[i] <== key[i];
    }
    
    // Key expansion loop
    Word() prevWords[52];
    Word() rotatedWords[52];
    Word() substitutedWords[52];
    signal {byte} roundConstants[52];
    Word() rconWords[52];
    Word() newWords[52];
    Word() prevRoundWords[52];
    Word() finalWords[52];

    for (var i = 8; i < 60; i++) {
        // Get previous word
        prevWords[i-8] <== expandedKey[i-1];
        
        // Check if special processing is needed
        if (i % 8 == 0) {
            // Every 8 words perform rotation and substitution, and xor with round constant
            rotatedWords[i-8] <== RotWord()(prevWords[i-8]);

            substitutedWords[i-8] <== SubWord()(rotatedWords[i-8]);

            // Get round constant
            roundConstants[i-8] <== RCon()((i \ 8) - 1);
            rconWords[i-8] <== [roundConstants[i-8], 0, 0, 0];
            newWords[i-8] <== XORWord()(substitutedWords[i-8],rconWords[i-8]);
        } else if (i % 8 == 4) {
            // At the half of every 8 words, perform substitution
            newWords[i-8] <== SubWord()(prevWords[i-8]);
        } else {
            // Other cases, direct copy
            newWords[i-8] <== prevWords[i-8];
        }
        
        // XOR with corresponding word from previous round
        expandedKey[i] <== XORWord()(newWords[i-8],expandedKey[i-8]);
    }
}