pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

/**
 * InRange Circuit Template
 * 
 * This zero-knowledge circuit template verifies whether an input value falls within
 * a specified range [min, max]. It ensures that min <= input <= max while maintaining
 * privacy of the actual values.
 * 
 * @param bits - The bit width for the numbers (e.g., 8, 16, 32, 64)
 */
template InRange(bits) {
    signal input in;
    signal input min;
    signal input max;
    signal output {bool} out;
    
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