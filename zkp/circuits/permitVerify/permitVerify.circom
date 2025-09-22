pragma circom 2.2.2;

include "../shared/components/permitVerify/permitHash.circom";
include "../shared/components/permitVerify/typedDataHash.circom";
include "../shared/components/permitVerify/pubkeyRecover.circom";
include "../shared/components/ecdsa/eth.circom";
include "../shared/components/bus.circom";

/*
 * Verifies the permit2 signature contained in the will
 * 
 * The imeplementation corresponds to the contracts deployed
 * at Mainnet 0x000000000022d473030f116ddee9f6b43ac78ba3
 * (SignatureTransfer.sol, ./libraries/PermitHash.sol, etc.)
 */
template VerifyPermit(numPermission) {
    signal input {address} testator;   // 20 byte unsigned integer
    input PermitBatchTransferFrom(numPermission) permit;
    signal input {address} will;       // 20 byte unsigned integer
    input EcdsaSignature() signature;

    var n = 64, k = 4;
    var chainId = 31337;

    // Hashes permit to get typed permit digest
    signal {bit} permitDigest[256] <== HashPermit(numPermission)(permit, will);
    signal {bit} typedPermitDigest[256] <== HashTypedData(chainId)(permitDigest);

    // Recovers signer from digest and signature
    signal pubkey[2][k] <== RecoverEcdsaPubkey(n, k)(typedPermitDigest, signature);
    signal pubkeyBits[512] <== FlattenPubkey(n, k)(pubkey);
    signal signer <== PubkeyToAddress()(pubkeyBits);

    // Check if signer is testator
    testator === signer;
}


// Auto updated: 2025-09-22T14:16:26.677Z
bus UntaggedPermitBatchTransferFrom(numPermission) {
    UntaggedTokenPermission() permitted[numPermission];
    signal nonce;
    signal deadline;
}

bus UntaggedEcdsaSignature() {
    signal r[4];
    signal s[4];
    signal v;
}

bus UntaggedTokenPermission() {
    signal token;
    signal amount;
}

template UntaggedVerifyPermit(numPermission) {
    signal input testator;
    input UntaggedPermitBatchTransferFrom(numPermission) permit;
    signal input will;
    input UntaggedEcdsaSignature() signature;

    signal {address} _testator <== testator;
    signal {address} _will <== will;

    PermitBatchTransferFrom(numPermission) _permit;
    EcdsaSignature() _signature;

    for (var i = 0; i < numPermission; i++) {
        _permit.permitted[i].token <== permit.permitted[i].token;
        _permit.permitted[i].amount <== permit.permitted[i].amount;
    }

    _permit.nonce <== permit.nonce;
    _permit.deadline <== permit.deadline;
    _signature.r <== signature.r;
    _signature.s <== signature.s;
    _signature.v <== signature.v;

    component verifypermitComponent = VerifyPermit(numPermission);
    verifypermitComponent.testator <== _testator;
    verifypermitComponent.permit <== _permit;
    verifypermitComponent.will <== _will;
    verifypermitComponent.signature <== _signature;
}

component main = UntaggedVerifyPermit(1);
