pragma circom 2.2.2;

// include "circomlib/circuits/bitify.circom";
// include "circomlib/circuits/sha256/shift.circom";
// include "circomlib/circuits/gates.circom";

template Theta() {
    signal input {bit} inputStateArray;
    signal output {bit} outStateArray;
    
    signal quotient;
    
    quotient <-- in \ 2;
    out <-- in % 2;
    
    in === quotient * 2 + out;
    
    out * (out - 1) === 0;
}