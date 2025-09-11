pragma circom 2.2.2;

bus Utf8() {
    signal {byte} bytes[4];
    signal {bit} validBytes[4];
}

bus Word() {
    signal {byte} bytes[4];
}

bus Estate() {
    signal {address} beneficiary;
    signal {address} token;
    signal amount;
}

bus TokenPermission() {
    signal {address} token;
    signal amount;
}

bus PermitTransferFrom(numPermission) {
    TokenPermission() permitted[numPermission];
    signal {uint128} nonce;
    signal {uint32} deadline;
}