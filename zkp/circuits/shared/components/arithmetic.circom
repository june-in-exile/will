pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

template Divide(dividendBits, divisorBits) {
    signal input {number} dividend;
    signal input {number} divisor;
    signal output {number} quotient;
    signal output {number} remainder;

    // constraint the bits of divisor and dividend
    _ = Num2Bits(divisorBits)(divisor);
    _ = Num2Bits(dividendBits)(dividend);

    // divisor > 0
    signal positiveDivisor <== GreaterThan(divisorBits)([divisor, 0]);
    positiveDivisor === 1;
    
    quotient <-- dividend \ divisor;
    remainder <-- dividend % divisor;
    dividend === quotient * divisor + remainder;
    
    // remainder < divisor
    signal validRemainder <== LessThan(divisorBits)([remainder, divisor]);
    validRemainder === 1;

    // quotient >= 0
    signal validQuotient <== GreaterEqThan(dividendBits)([quotient, 0]);
    validQuotient === 1;
}

template MultiplyArray(n) {
    signal input {number} a[n];
    signal input {number} b[n];
    signal output {number} c[n];

    for (var i = 0; i < n; i++) {
        c[i] <== a[i] * b[i];
    }
}