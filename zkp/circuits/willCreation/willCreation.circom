pragma circom 2.2.2;

include "../shared/components/aesGcm/ctrDecrypt.circom";
include "../shared/components/deserialization.circom";
include "../shared/components/bus.circom";

template CreateWill(keyBits, ciphertextBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }

    var numEstates = calNumEstates(ciphertextBytes);

    signal input {byte} ciphertext[ciphertextBytes];
    input Word() key[Nk];
    signal input {byte} iv[16];
    signal input {address} expectedTestator;
    input Estate() expectedEstates[numEstates];

    // decryption
    var plaintextBytes = ciphertextBytes;
    signal {byte} plaintext[plaintextBytes] <== CtrDecrypt(256, ciphertextBytes)(ciphertext, key, iv);
    
    // deserialization
    signal {address} testator;
    Estate() estates[numEstates];
    (testator, estates, _, _, _, _, _) <== Deserialize(plaintextBytes)(plaintext);

    expectedTestator === testator;

    for (var i = 0; i < numEstates; i++) {
        expectedEstates[i].beneficiary === estates[i].beneficiary;
        expectedEstates[i].token === estates[i].token;
        expectedEstates[i].amount === estates[i].amount;
    }
}


// Auto updated: 2025-09-21T09:51:34.083Z
bus UntaggedWord() {
    signal bytes[4];
}

bus UntaggedEstate() {
    signal beneficiary;
    signal token;
    signal amount;
}

template UntaggedCreateWill(keyBits, ciphertextBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }
    var numEstates = calNumEstates(ciphertextBytes);

    signal input ciphertext[ciphertextBytes];
    input UntaggedWord() key[Nk];
    signal input iv[16];
    signal input expectedTestator;
    input UntaggedEstate() expectedEstates[numEstates];

    signal {byte} _ciphertext[ciphertextBytes];
    _ciphertext <== ciphertext;
    signal {byte} _iv[16];
    _iv <== iv;
    signal {address} _expectedTestator <== expectedTestator;

    Word() _key[Nk];
    Estate() _expectedEstates[numEstates];

    for (var i = 0; i < Nk; i++) {
        _key[i].bytes <== key[i].bytes;
    }

    for (var i = 0; i < numEstates; i++) {
        _expectedEstates[i].beneficiary <== expectedEstates[i].beneficiary;
        _expectedEstates[i].token <== expectedEstates[i].token;
        _expectedEstates[i].amount <== expectedEstates[i].amount;
    }


    component createwillComponent = CreateWill(keyBits, ciphertextBytes);
    createwillComponent.ciphertext <== _ciphertext;
    createwillComponent.key <== _key;
    createwillComponent.iv <== _iv;
    createwillComponent.expectedTestator <== _expectedTestator;
    createwillComponent.expectedEstates <== _expectedEstates;
}

component main {public [ciphertext, iv, expectedTestator, expectedEstates]} = UntaggedCreateWill(256, 269);
