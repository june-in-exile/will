pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";

template Divide(dividendBits, divisorBits) {
    signal input dividend;
    signal input divisor;
    signal output quotient;
    signal output remainder;

    // Constraint the bits of modulus
    _ = Num2Bits(divisorBits)(divisor);
    _ = Num2Bits(dividendBits)(dividend);

    // divisor > 0
    signal {bool} positiveDivisor <== GreaterThan(divisorBits)([divisor, 0]);
    positiveDivisor === 1;
    
    quotient <-- dividend \ divisor;
    remainder <-- dividend % divisor;
    dividend === quotient * divisor + remainder;
    
    // remainder < divisor
    signal {bool} validRemainder <== LessThan(divisorBits)([remainder, divisor]);
    validRemainder === 1;

    // quotient >= 0
    signal {bool} validQuotient <== GreaterEqThan(dividendBits)([quotient, 0]);
    validQuotient === 1;
}