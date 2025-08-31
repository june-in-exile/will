pragma circom 2.2.2;

bus Utf8() {
    signal {byte} bytes[4];
    signal {bit} validBytes[4];
}

bus Word() {
    signal {byte} bytes[4];
}

bus Address() {
    signal {ascii} hex[40];
}

bus Estate() {
    Address bebeficiary;
    Address token;
    signal amount;
}