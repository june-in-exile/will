pragma circom 2.2.2;

include "permitHash.circom";
include "typedDataHash.circom";
include "pubkeyRecover.circom";
include "../ecdsa/eth.circom";
include "../bus.circom";

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

