pragma circom 2.2.2;

include "circomlib/circuits/gates.circom";
include "circomlib/circuits/multiplexer.circom";
include "../shared/components/bits.circom";
include "../shared/components/aes256gcm/substituteBytes.circom";

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

/**
 * Symbols:
 *   Nk: the key size in words
 *   Nb: the block size in words
 *   Nr: the number of rounds
 *   key[i...i+3]: the sequence key[i],key[i+1],key[i+2],key[i+3]. 
 *   w[i]: the i-th word (a total of 4*Nr+4=60 words).
 *
 * Key-Block-Round Combinations:
 *           Nk   Nb   Nr
 * AES-128   4    4    10
 * AES-192   6    4    12
 * AES-256   8    4    14
 *
 * Key expansion rule:
 *   for i < Nk:
 *     w[i] = key[4*i...4*i+3]
 *   for i >= Nk:
 *     if (i mod Nk == 0)
 *       w[i] = w[i - Nk] ⊕ SubWord(RotWord(w[i - 1])) ⊕ Rcon[i / Nk]
 *     else if (Nk > 6 and i mod Nk == 4)
 *       w[i] = w[i - Nk] ⊕ SubWord(w[i - 1])
 *     else
 *       w[i] = w[i - Nk] ⊕ w[i - 1]
 */
template ExpandKey() {
    input Word() key[8];
    output Word() expandedKey[60];

    Word() prevWords[52];
    Word() rotatedWords[7];
    Word() substitutedWords[7];
    signal {byte} roundConstants[7];
    Word() rconWords[7];
    Word() newWords[52];
    
    
    for (var wordIndex = 0; wordIndex < 60; wordIndex++) {
        if (wordIndex < 8) {
            // First two rounds: copy original key
            expandedKey[wordIndex] <== key[wordIndex];
        } else {
            // Get previous word
            prevWords[i-8] <== expandedKey[i-1];
            
            // Special processing by round (1 round = 4 words = 32 bytes)
            var round = i \ 4;
            if (i % 8 == 0) {
                // Every 2 rounds (8 words) perform rotation and substitution, and xor with round constant
                rotatedWords[(i\8)-1] <== RotWord()(prevWords[i-8]);

                substitutedWords[(i\8)-1] <== SubWord()(rotatedWords[(i\8)-1]);

                // Get round constant
                roundConstants[(i\8)-1] <== RCon()((i\8)-1);
                rconWords[(i\8)-1].bytes <== [roundConstants[(i\8)-1], 0, 0, 0];
                newWords[i-8] <== XORWord()(substitutedWords[(i\8)-1],rconWords[(i\8)-1]);
            } else if (i % 8 == 4) {
                // Every 4 words perform substitution
                newWords[i-8] <== SubWord()(prevWords[i-8]);
            } else {
                // Other cases, direct copy
                newWords[i-8] <== prevWords[i-8];
            }
            
            // XOR with corresponding word from previous round
            expandedKey[i] <== XORWord()(newWords[i-8],expandedKey[i-1]);
        }
    }
}

template TestExpandKey() {
    signal input key[8][4];
    output Word() expandedKey[60];

    Word() _key[8];
    for (var i = 0; i < 8; i++) {
        _key[i].bytes <== key[i];
    }

    expandedKey <== ExpandKey()(_key);
}

component main = TestExpandKey();