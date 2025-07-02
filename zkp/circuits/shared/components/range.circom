pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template InRange(bits) {
    signal input in;
    signal input min;
    signal input max;
    signal output out;
    
    // Constraint the bits of in, min and max
    component inBits = Num2Bits(bits);
    component minBits = Num2Bits(bits);
    component maxBits = Num2Bits(bits);
    
    inBits.in <== in;
    minBits.in <== min;
    maxBits.in <== max;
    
    // min <= max
    component minLeqMax = LessEqThan(bits);
    minLeqMax.in[0] <== min;
    minLeqMax.in[1] <== max;
    minLeqMax.out === 1;
    
    component geq = GreaterEqThan(bits);
    component leq = LessEqThan(bits);
    
    geq.in[0] <== in;
    geq.in[1] <== min;
    
    leq.in[0] <== in;
    leq.in[1] <== max;
    
    out <== geq.out * leq.out;
}