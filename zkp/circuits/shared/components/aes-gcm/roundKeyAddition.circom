pragma circom 2.2.2;

include "../bus.circom";
include "../bits.circom";

template AddRoundKey() {
    signal input {byte} state[16];
    input Word() roundKey[4];
    signal output {byte} out[16];

    signal roundKeyBytes[16];
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            roundKeyBytes[i * 4 + j] <== roundKey[i].bytes[j];
        }
    }
    
    for (var i = 0; i < 16; i++) {
        out[i] <== BitwiseXor(2,8)([state[i],roundKeyBytes[i]]);
    }
}