pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

/**
 * Example: Integer division with remainder
 *  signal quotient, remainder;
 *  (quotient,remainder) <== Divide(8,8)(17,5);
 *  quotient === 3;
 *  remainder === 2;
 */
template Divide() {
    signal input dividend;
    signal input divisor;
    signal output quotient;
    signal output remainder;

    quotient <-- dividend \ divisor;
    remainder <-- dividend % divisor;
    dividend === quotient * divisor + remainder;
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