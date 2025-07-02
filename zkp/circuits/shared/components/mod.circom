pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";

template Modulo(modulusBits) {
    signal input in;
    signal input modulus; 
    signal output quotient;
    signal output remainder;

    component check_modulus_range = LessThan(modulusBits);
    check_modulus_range.in[0] <== modulus;
    check_modulus_range.in[1] <== 1 << modulusBits;
    check_modulus_range.out === 1;
    
    quotient <-- in \ modulus;
    remainder <-- in % modulus;
    remainder === in - quotient * modulus;
    
    in === quotient * modulus + remainder;
    
    // remainder < modulus
    component remainderCheck = LessThan(modulusBits);
    remainderCheck.in[0] <== remainder;
    remainderCheck.in[1] <== modulus;
    remainderCheck.out === 1;

    // quotient >= 0
    component quotientCheck = GreaterEqThan(modulusBits);
    quotientCheck.in[0] <== quotient;
    quotientCheck.in[1] <== 0;
    quotientCheck.out === 1;
}