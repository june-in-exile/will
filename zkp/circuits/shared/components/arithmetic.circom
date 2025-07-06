pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

/**
 * @param dividendBits - Bit width for the dividend
 * @param divisorBits - Bit width for the divisor
 * 
 * Example: Integer division with remainder
 *  signal quotient, remainder;
 *  (quotient,remainder) <== Divide(8,8)(17,5);
 *  quotient === 3;
 *  remainder === 2;
 */
template Divide(dividendBits, divisorBits) {
    signal input dividend;
    signal input divisor;
    signal output quotient;
    signal output remainder;

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

/**
 * Mathematical operation: c[i] = a[i] × b[i] for all i in [0, n-1]
 * 
 * @param n - The length of the input and output arrays
 *
 * Example: Element-wise array multiplication
 *  signal products[4] = MultiplyArray(4)([2, 3, 4, 5],[10, 20, 30, 40]);
 *  Results: [20, 60, 120, 200];
 */
template MultiplyArray(n) {
    signal input a[n];
    signal input b[n];
    signal output c[n];

    for (var i = 0; i < n; i++) {
        c[i] <== a[i] * b[i];
    }
}