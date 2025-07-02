pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template InRange(bits) {
    signal input in;
    signal input min;
    signal input max;
    signal output out;
    
    // Constraint the bits of in, min and max
    _ = Num2Bits(bits)(in);
    _ = Num2Bits(bits)(min);
    _ = Num2Bits(bits)(max);
    
    // min <= max
    signal minLeqMax <== LessEqThan(bits)([min,max]);
    minLeqMax === 1;
    
    signal inGeqMin <== GreaterEqThan(bits)([in,min]);
    signal inLeqMax <== LessEqThan(bits)([in,max]);
    
    out <== inGeqMin * inLeqMax;
}