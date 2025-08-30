pragma circom 2.2.2;

// include "circomlib/circuits/comparators.circom";
// include "circomlib/circuits/bitify.circom";
// include "range.circom";

template BytesToLane() {
    // Byte8ToNum
    
}

template LaneToBytes() {
    // NumToByte8
}


template BytesToStateArray() {
    signal input {byte} bytes[200]; // 1600-bit state size
    signal output {bit} stateArray[5][5][64];
}

template StateArrayToBytes() {
    signal output {bit} stateArray[5][5][64]; // 1600-bit state size
    signal input {byte} bytes[200];
}