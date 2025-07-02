pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";

template Modulo(modulusBits) {
    signal input in;
    signal input modulus; 
    signal output quotient;
    signal output remainder;

    // Constraint the bits of modulus
    _ = Num2Bits(modulusBits)(modulus);
    
    quotient <-- in \ modulus;
    remainder <-- in % modulus;
    remainder === in - quotient * modulus;
    
    in === quotient * modulus + remainder;
    
    // remainder < modulus
    signal validRemainder <== LessThan(modulusBits)([remainder,modulus]);
    validRemainder === 1;

    // quotient >= 0
    signal validQuotient <== GreaterEqThan(modulusBits)([quotient,0]);
    validQuotient === 1;
}