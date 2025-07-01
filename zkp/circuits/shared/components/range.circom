pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";

template InRange(bits, min, max) {
    signal input in;
    signal output out;
    
    component geq = GreaterEqThan(bits);
    component leq = LessEqThan(bits);
    
    geq.in[0] <== in;
    geq.in[1] <== min;
    
    leq.in[0] <== in;
    leq.in[1] <== max;
    
    out <== geq.out * leq.out;
}