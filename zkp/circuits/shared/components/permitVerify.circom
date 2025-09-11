pragma circom 2.2.2;

include "./abiEncoder/abiEncoder.circom";
include "./keccak256/keccak256.circom";
include "./bits.circom";
include "./bus.circom";

/*
 * Verifies the permit2 signature contained in the will
 * 
 * The imeplementation corresponds to the contracts deployed
 * at Mainnet 0x000000000022d473030f116ddee9f6b43ac78ba3
 * (SignatureTransfer.sol, ./libraries/PermitHash.sol, etc.)
 */
// template VerifyPermit2Signature() {
//     signal input {address} testator;   // 20 byte unsigned integer
//     input Estate() estates[estateCount];
//     signal input {address} will;       // 20 byte unsigned integer
//     signal input {uint128} nonce;      // 16 byte (128 bit) unsigned integer
//     signal input {uint32} deadline;    // 4 byte (32 bit) unsigned integer
//     signal input {byte} signature[signatureBytesLength]; // 65 byte
//     signal output {bit} validSignature;

// }

/*
 * Permit is composed of estate.tokens, estate.amounts, nonce, deadline, and spender (will contract in our case)
 */
template HashPermit(estateCount) {
    input Estate() estates[estateCount];
    signal input {uint128} nonce;   // 16 byte (128 bit) unsigned integer
    signal input {uint32} deadline; // 4 byte (32 bit) unsigned integer
    signal input {address} spender; // 20 byte unsigned integer
    signal output {bit} permitDigest[256];

    signal {byte} TOKEN_PERMISSIONS_TYPEHASH[32] <== [
        97, 131,  88, 172,  61, 184, 220,  39,
        79,  12, 216, 130, 157, 167, 226,  52,
        189,  72, 205, 115, 196, 167,  64, 174,
        222,  26, 222, 201, 132, 109,   6, 161
    ];

    signal {byte} PERMIT_BATCH_TRANSFER_FROM_TYPEHASH[32] <== [
        252, 243, 95,  90, 198, 162, 194, 136,
        104, 220, 68, 195,   2,  22, 100, 112,
        38,  98, 57,  25,  95,   2, 176, 238,
        64, 131, 52, 130, 147,  51, 183, 102
    ];

    var tokenPermissionBytes = 3 * 32;

    signal {byte} bytesTokens[estateCount][32];
    signal {byte} bytesAmounts[estateCount][32];
    signal {byte} bytesTokenPermissions[estateCount][tokenPermissionBytes];
    signal {bit} bitsTokenPermissions[estateCount][tokenPermissionBytes * 8];
    signal {bit} bitsTokenPermissionDigests[estateCount][256];

    component abiEncoders[estateCount + 1];
    for (var i = 0; i < estateCount; i++) {
        // Converts token address from number to bytes (big-endian)
        bytesTokens[i] <== NumToBytes(32, 0)(estates[i].token);
        // Converts amount from number to bytes (big-endian)
        bytesAmounts[i] <== NumToBytes(32, 0)(estates[i].amount);
        // Gets token permission by encoding TOKEN_PERMISSIONS_TYPEHASH, estates[i].token, estates[i].amount
        // bytesTokenPermissions[i] <== AbiEncode(3)([TOKEN_PERMISSIONS_TYPEHASH, bytesTokens[i], bytesAmounts[i]]);
        abiEncoders[i] = AbiEncode(3);
        abiEncoders[i].values[0] <== TOKEN_PERMISSIONS_TYPEHASH;
        abiEncoders[i].values[1] <== bytesTokens[i];
        abiEncoders[i].values[2] <== bytesAmounts[i];
        bytesTokenPermissions[i] <== abiEncoders[i].encodedValue;
        // Converts token permission to bits
        bitsTokenPermissions[i] <== BytesToBits(tokenPermissionBytes, 1)(bytesTokenPermissions[i]);
        // Hashes token permission
        bitsTokenPermissionDigests[i] <== Keccak256(tokenPermissionBytes * 8)(bitsTokenPermissions[i]);
    }

    // Concats token permission digests
    var concatedPermissionBits = estateCount * 256;
    signal {bit} bitsConcatedPermission[concatedPermissionBits];
    for (var i = 0; i < estateCount; i++) {
        for (var j = 0; j < 256; j++) {
            bitsConcatedPermission[i * 256 + j] <== bitsTokenPermissionDigests[i][j];
        }
    }
    
    // Hashes concated token permission digests
    signal {bit} bitsPermissionsDigest[256] <== Keccak256(concatedPermissionBits)(bitsConcatedPermission);

    // Gets batch permit by encoding PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, digest of concated token permission digests, spender, nonce, deadline
    signal {byte} bytesPermissionsDigest[32] <== BitsToBytes(32, 1)(bitsPermissionsDigest);
    signal {byte} bytesSpender[32] <== NumToBytes(32, 0)(spender);
    signal {byte} bytesNonce[32] <== NumToBytes(32, 0)(nonce);
    signal {byte} bytesDeadline[32] <== NumToBytes(32, 0)(deadline);

    var batchPermitBytes = 5 * 32;

    // signal {byte} bytesBatchPermit[batchPermitBytes] <== AbiEncode(5)([PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, bytesPermissionsDigest, bytesSpender, bytesNonce, bytesDeadline]);
    
    abiEncoders[estateCount] = AbiEncode(5);
    abiEncoders[estateCount].values[0] <== PERMIT_BATCH_TRANSFER_FROM_TYPEHASH;
    abiEncoders[estateCount].values[1] <== bytesPermissionsDigest;
    abiEncoders[estateCount].values[2] <== bytesSpender;
    abiEncoders[estateCount].values[3] <== bytesNonce;
    abiEncoders[estateCount].values[4] <== bytesDeadline;
    signal {byte} bytesBatchPermit[batchPermitBytes] <== abiEncoders[estateCount].encodedValue;
    signal {bit} bitsBatchPermit[batchPermitBytes * 8] <== BytesToBits(batchPermitBytes, 1)(bytesBatchPermit);

    permitDigest <== Keccak256(batchPermitBytes * 8)(bitsBatchPermit);
}
