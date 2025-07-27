pragma circom 2.2.2;

template Multiplier2() {
    signal input a;
    signal input b;
    signal output c;
    c <== a*b;
}

// component main = Multiplier2();

// Auto updated: 2025-07-27T14:56:24.681Z
template UntaggedMultiplier2() {
    signal input a;
    signal input b;
    signal output c;

    component multiplier2Component = Multiplier2();
    multiplier2Component.a <== a;
    multiplier2Component.b <== b;
    c <== multiplier2Component.c;
}

component main = UntaggedMultiplier2();
