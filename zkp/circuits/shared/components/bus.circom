pragma circom 2.2.2;

bus Utf8() {
    signal {byte} bytes[4];
    signal {bit} validBytes[4];
}

bus Word() {
    signal {byte} bytes[4];
}