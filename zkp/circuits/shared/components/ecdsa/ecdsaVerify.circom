pragma circom 2.2.2;

include "ecdsa.circom";

// r, s, msghash, and pubkey have coordinates
// encoded with k registers of n bits each
// signature is (r, s)
template EcdsaVerify(n, k) {
    // Check the pubkey is valid
    // Lies on the curve, not equal to zero, etc

    signal input r[k];
    signal input s[k];
    signal input msghash[k];
    signal input pubkey[2][k];

    signal output result;

    result <== ECDSAVerifyNoPubkeyCheck(n, k)(r, s, msghash, pubkey);
}