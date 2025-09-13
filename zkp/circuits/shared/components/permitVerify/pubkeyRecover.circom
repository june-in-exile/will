pragma circom 2.2.2;

include "../ecdsa/ecdsa.circom";

function recover_r_point(r, v) {
    var R[2][k];
    // compute R

    return R;
}

function recover_pubkey(n, k, msghash, r, s, v) {
    var R[2][k] = recover_r_point(r, v);

    var rinv = r ** (-1);

    var s_mult_R = s * R;

    var h_mult_G = h * G;

    var sR_minus_hG = s_mult_R - h * G;

    var r_times_pubkey = sR_minus_hG;

    var pubkey = rinv * r_times_pubkey;

    return pubkey;
}

template RecoverPubkey(_arg) {

    // Declaration of signals.
    signal input _in;
    signal output _out;

    // Constraints.

}
