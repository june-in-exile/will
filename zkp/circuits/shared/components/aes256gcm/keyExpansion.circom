pragma circom 2.2.2;

include "circomlib/circuits/gates.circom";
include "circomlib/circuits/multiplexer.circom";
include "byteSubstitution.circom";
include "../bus.circom";
include "../bits.circom";

template RotWord() {
    input Word() in;
    output Word() out;
    
    for (var i = 0; i < 4; i++) {
        out.bytes[i] <== in.bytes[(i + 1) % 4];
    }
}

template XorWord() {
    input Word() a;
    input Word() b;
    output Word() c;
    
    signal _a[4] <== a.bytes;
    signal _b[4] <== b.bytes;
    for (var i = 0; i < 4; i++) {
        c.bytes[i] <== BitwiseXor(2,8)([_a[i],_b[i]]);
    }
}

template RCon() {
    signal input round;
    output Word() out;

    var wIn = 1, nIn = 10;

    var roundConstants[nIn][wIn] = [
        [0x01],[0x02],[0x04],[0x08],
        [0x10],[0x20],[0x40],[0x80],
        [0x1b],[0x36]
    ];
    
    signal {byte} outs[wIn] <== Multiplexer(wIn,nIn)(roundConstants,round);
    out.bytes <== [outs[0], 0, 0 , 0];
}

/**
 * FIPS 197 AES 5.2 KEYEXPANSION()
 * 
 * Symbols:
 *   Nk: the key size in words
 *   Nb: the block size in words
 *   Nr: the number of rounds
 *   key[i...i+3]: the sequence key[i],key[i+1],key[i+2],key[i+3]. 
 *   w[i]: the i-th word (a total of 4*Nr+4=60 words).
 *
 * Key-Block-Round Combinations:
 *           Nk(words) Nb(words) Nr(rounds)
 * AES-128      4          4         10
 * AES-192      6          4         12
 * AES-256      8          4         14
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
template ExpandKey(keyBits) {
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

    input Word() key[Nk];
    output Word() expandedKey[expandedNk];

    for (var i = 0; i < Nk; i++) {
        expandedKey[i] <== key[i];
    }
    for (var i = Nk; i < expandedNk; i++) {
        if (i % Nk == 0) {
            expandedKey[i] <== XorWord()(expandedKey[i-Nk], XorWord()(SubWord()(RotWord()(expandedKey[i-1])), RCon()((i\Nk)-1)));
        } else if (Nk > 6 && i % Nk == 4) {
            expandedKey[i] <== XorWord()(expandedKey[i-Nk], SubWord()(expandedKey[i-1]));
        } else {
            expandedKey[i] <== XorWord()(expandedKey[i-Nk], expandedKey[i-1]);
        }
    }
}