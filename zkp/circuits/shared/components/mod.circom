pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template ModuloCircuit(inputBits, modulusBits) {
    signal input in;
    signal output out;
    
    var modulus = 1 << modulusBits;
    
    signal quotient;
    quotient <== in \ modulus;
    
    out <== in - quotient * modulus;
    
    component rangeCheck = LessEqThan(modulusBits);
    rangeCheck.in[0] <== out;
    rangeCheck.in[1] <== modulus - 1;
    rangeCheck.out === 1;
}