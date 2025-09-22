pragma circom 2.2.2;

include "../shared/components/aesGcm/ctrDecrypt.circom";
include "../shared/components/permitVerify/permitVerify.circom";
include "../shared/components/deserialization.circom";
include "../shared/components/bus.circom";

template UploadCid(keyBits, ciphertextBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }

    signal input {byte} ciphertext[ciphertextBytes];
    input Word() key[Nk];
    signal input {byte} iv[16];

    // decryption
    var plaintextBytes = ciphertextBytes;
    signal {byte} plaintext[plaintextBytes] <== CtrDecrypt(256, ciphertextBytes)(ciphertext, key, iv);
    
    // deserialization
    var numEstates = calNumEstates(plaintextBytes);
    signal {address} testator;
    Estate() estates[numEstates];
    signal {address} will;
    signal {uint128} nonce;
    signal {uint32} deadline;
    EcdsaSignature() signature;
    (testator, estates, _, will, nonce, deadline, signature) <== Deserialize(plaintextBytes)(plaintext);

    // verification
    var numPermission = numEstates;
    PermitBatchTransferFrom(numPermission) permit;
    for (var i = 0; i < numPermission; i++) {
        permit.permitted[i].token <== estates[i].token;
        permit.permitted[i].amount <== estates[i].amount;
    }
    permit.nonce <== nonce;
    permit.deadline <== deadline;
    VerifyPermit(numPermission)(testator, permit, will, signature);
}


// Auto updated: 2025-09-20T14:05:17.901Z
bus UntaggedWord() {
    signal bytes[4];
}

template UntaggedUploadCid(keyBits, ciphertextBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }

    signal input ciphertext[ciphertextBytes];
    input UntaggedWord() key[Nk];
    signal input iv[16];

    signal {byte} _ciphertext[ciphertextBytes];
    _ciphertext <== ciphertext;
    signal {byte} _iv[16];
    _iv <== iv;

    Word() _key[Nk];

    for (var i = 0; i < Nk; i++) {
        _key[i].bytes <== key[i].bytes;
    }


    component uploadcidComponent = UploadCid(keyBits, ciphertextBytes);
    uploadcidComponent.ciphertext <== _ciphertext;
    uploadcidComponent.key <== _key;
    uploadcidComponent.iv <== _iv;
}

component main {public [ciphertext, iv]} = UntaggedUploadCid(256, 269);
