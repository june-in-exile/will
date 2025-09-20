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
template VerifyPermit(numEstates) {
    signal input {address} testator;   // 20 byte unsigned integer
    input Estate() estates[numEstates];
    signal input {uint128} nonce;      // 16 byte (128 bit) unsigned integer
    signal input {uint32} deadline;    // 4 byte (32 bit) unsigned integer
    signal input {address} will;       // 20 byte unsigned integer
    input EcdsaSignature() signature;

    var numPermission = numEstates;
    var n = 64, k = 4;
    var chainId = 31337;

    // Converts estates to permit
    PermitBatchTransferFrom(numPermission) permit;
    for (var i = 0; i < numPermission; i++) {
        permit.permitted[i].token <== estates[i].token;
        permit.permitted[i].amount <== estates[i].amount;
    }
    permit.nonce <== nonce;
    permit.deadline <== deadline;

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



// Auto updated: 2025-09-20T14:02:57.321Z
bus UntaggedEstate() {
    signal beneficiary;
    signal token;
    signal amount;
}

bus UntaggedEcdsaSignature() {
    signal r[4];
    signal s[4];
    signal v;
}

template UntaggedVerifyPermit(numEstates) {
    signal input testator;
    input UntaggedEstate() estates[numEstates];
    signal input nonce;
    signal input deadline;
    signal input will;
    input UntaggedEcdsaSignature() signature;

    signal {address} _testator <== testator;
    signal {uint128} _nonce <== nonce;
    signal {uint32} _deadline <== deadline;
    signal {address} _will <== will;

    Estate() _estates[numEstates];
    EcdsaSignature() _signature;

    for (var i = 0; i < numEstates; i++) {
        _estates[i].beneficiary <== estates[i].beneficiary;
        _estates[i].token <== estates[i].token;
        _estates[i].amount <== estates[i].amount;
    }

    _signature.r <== signature.r;
    _signature.s <== signature.s;
    _signature.v <== signature.v;

    component verifypermitComponent = VerifyPermit(numEstates);
    verifypermitComponent.testator <== _testator; 
    verifypermitComponent.estates <== _estates;
    verifypermitComponent.nonce <== _nonce;
    verifypermitComponent.deadline <== _deadline;
    verifypermitComponent.will <== _will;
    verifypermitComponent.signature <== _signature;
}

component main = UntaggedVerifyPermit(1);
