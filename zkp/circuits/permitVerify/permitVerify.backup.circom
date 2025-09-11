pragma circom 2.2.2;

include "../shared/components/abiEncoder/abiEncoder.circom";
include "../shared/components/keccak256/keccak256.circom";
include "../shared/components/bits.circom";
include "../shared/components/bus.circom";

template HashPermit(numPermission) {
    input TokenPermission() permitted[numPermission];
    signal input {uint128} nonce;
    signal input {uint32} deadline;
    signal input {address} spender;
    signal output {byte} permitDigest[32];

    var TOKEN_PERMISSIONS_TYPEHASH[32] = [
        97, 131,  88, 172,  61, 184, 220,  39,
        79,  12, 216, 130, 157, 167, 226,  52,
        189,  72, 205, 115, 196, 167,  64, 174,
        222,  26, 222, 201, 132, 109,   6, 161
    ];

    var PERMIT_BATCH_TRANSFER_FROM_TYPEHASH[32] = [
        252, 243, 95,  90, 198, 162, 194, 136,
        104, 220, 68, 195,   2,  22, 100, 112,
        38,  98, 57,  25,  95,   2, 176, 238,
        64, 131, 52, 130, 147,  51, 183, 102
    ];

    signal {byte} bytesTokens[numPermission][32];
    signal {byte} bytesAmounts[numPermission][32];
    signal {byte} bytesTokenPermissions[numPermission][3][32];

    var tokenPermissionBytes = 3 * 32;
    signal {byte} bytesTokenPermissionsEncoded[numPermission][tokenPermissionBytes];
    signal {bit} bitsTokenPermissions[numPermission][tokenPermissionBytes * 8];
    signal {bit} bitsTokenPermissionDigests[numPermission][256];

    for (var i = 0; i < numPermission; i++) {
        // Converts token address and amount from number to bytes (big-endian)
        bytesTokens[i] <== NumToBytes(32, 0)(permitted[i].token);
        bytesAmounts[i] <== NumToBytes(32, 0)(permitted[i].amount);
        
        // Gets token permission by encoding TOKEN_PERMISSIONS_TYPEHASH, permitted[i].token, permitted[i].amount
        bytesTokenPermissions[i] <== [TOKEN_PERMISSIONS_TYPEHASH, bytesTokens[i], bytesAmounts[i]];
        bytesTokenPermissionsEncoded[i] <== AbiEncode(3)(bytesTokenPermissions[i]);
        
        // Hashes token permission
        bitsTokenPermissions[i] <== BytesToBits(tokenPermissionBytes, 1)(bytesTokenPermissionsEncoded[i]);
        bitsTokenPermissionDigests[i] <== Keccak256(tokenPermissionBytes * 8)(bitsTokenPermissions[i]);
    }

    // Concats token permission digests
    var concatedPermissionBits = numPermission * 256;
    signal {bit} bitsConcatedPermission[concatedPermissionBits];
    for (var i = 0; i < numPermission; i++) {
        for (var j = 0; j < 256; j++) {
            bitsConcatedPermission[i * 256 + j] <== bitsTokenPermissionDigests[i][j];
        }
    }
    
    // Hashes concated token permission digests
    signal {bit} bitsPermissionsDigest[256] <== Keccak256(concatedPermissionBits)(bitsConcatedPermission);

    // Converts permission digest from bits to bytes (LSB-first)
    signal {byte} bytesPermissionsDigest[32] <== BitsToBytes(32, 1)(bitsPermissionsDigest);

    // Converts spender, nonce and deadline from number to bytes (big-endian)
    signal {byte} bytesSpender[32] <== NumToBytes(32, 0)(spender);
    signal {byte} bytesNonce[32] <== NumToBytes(32, 0)(nonce);
    signal {byte} bytesDeadline[32] <== NumToBytes(32, 0)(deadline);
    signal {byte} bytesBatchPermit[5][32] <== [PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, bytesPermissionsDigest, bytesSpender, bytesNonce, bytesDeadline];

    // Gets batch permit by encoding PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, digest of concated token permission digests, spender, nonce, deadline
    var batchPermitBytes = 5 * 32;
    signal {byte} bytesBatchPermitEncoded[batchPermitBytes] <== AbiEncode(5)(bytesBatchPermit);

    // Hashes batch permit
    signal {bit} bitsBatchPermit[batchPermitBytes * 8] <== BytesToBits(batchPermitBytes, 1)(bytesBatchPermitEncoded);
    signal {bit} bitsPermitDigest[256] <== Keccak256(batchPermitBytes * 8)(bitsBatchPermit);
    permitDigest <== BitsToBytes(32, 1)(bitsPermitDigest);
}

// Auto updated: 2025-09-11T18:22:59.171Z
bus UntaggedTokenPermission() {
    signal token;
    signal amount;
}

template UntaggedHashPermit(numPermission) {
    input UntaggedTokenPermission() permitted[numPermission];
    signal input nonce;
    signal input deadline;
    signal input spender;
    signal output {byte} permitDigest[32];

    signal {uint128} _nonce <== nonce;
    signal {uint32} _deadline <== deadline;
    signal {address} _spender <== spender;

    TokenPermission() _permitted[numPermission];

    for (var i = 0; i < numPermission; i++) {
        _permitted[i].token <== permitted[i].token;
        _permitted[i].amount <== permitted[i].amount;
    }


    component hashpermitComponent = HashPermit(numPermission);
    hashpermitComponent.permitted <== _permitted;
    hashpermitComponent.nonce <== _nonce;
    hashpermitComponent.deadline <== _deadline;
    hashpermitComponent.spender <== _spender;
    permitDigest <== hashpermitComponent.permitDigest;
}

component main = UntaggedHashPermit(numPermission);
