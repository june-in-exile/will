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
//     input TokenPermission() permitted[numPermission];
//     signal input {address} will;       // 20 byte unsigned integer
//     signal input {uint128} nonce;      // 16 byte (128 bit) unsigned integer
//     signal input {uint32} deadline;    // 4 byte (32 bit) unsigned integer
//     signal input {byte} signature[signatureBytesLength]; // 65 byte
//     signal output {bit} validSignature;

// }

/*
 * Permit is composed of permitted.tokens, permitted.amounts, nonce, deadline. Spender in our case is will contract.
 * Solidity implementation: https://github.com/Uniswap/permit2/blob/cc56ad0f3439c502c246fc5cfcc3db92bb8b7219/src/libraries/PermitHash.sol#L66
 *
 * @param numPermission - number of token permissions
 */
template HashPermit(numPermission) {
    input PermitTransferFrom(numPermission) permit;
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
        bytesTokens[i] <== NumToBytes(32, 0)(permit.permitted[i].token);
        bytesAmounts[i] <== NumToBytes(32, 0)(permit.permitted[i].amount);
        
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
    signal {byte} bytesNonce[32] <== NumToBytes(32, 0)(permit.nonce);
    signal {byte} bytesDeadline[32] <== NumToBytes(32, 0)(permit.deadline);
    signal {byte} bytesBatchPermit[5][32] <== [PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, bytesPermissionsDigest, bytesSpender, bytesNonce, bytesDeadline];

    // Gets batch permit by encoding PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, digest of concated token permission digests, spender, nonce, deadline
    var batchPermitBytes = 5 * 32;
    signal {byte} bytesBatchPermitEncoded[batchPermitBytes] <== AbiEncode(5)(bytesBatchPermit);

    // Hashes batch permit
    signal {bit} bitsBatchPermit[batchPermitBytes * 8] <== BytesToBits(batchPermitBytes, 1)(bytesBatchPermitEncoded);
    signal {bit} bitsPermitDigest[256] <== Keccak256(batchPermitBytes * 8)(bitsBatchPermit);
    permitDigest <== BitsToBytes(32, 1)(bitsPermitDigest);
}


/*
 * The DOMAIN_SEPARATOR can be queried permit2 contract (fixed address: 0x000000000022d473030f116ddee9f6b43ac78ba3)
 *   - Mainnet: https://etherscan.io/address/0x000000000022d473030f116ddee9f6b43ac78ba3#readContract#F1
 *   - Arbitrum Sepolia: https://sepolia.arbiscan.io/address/0x000000000022d473030f116ddee9f6b43ac78ba3#readContract#F1
 *
 * @param chainId - Chain ID (Mainnet = 1, Arbitrum Sepolia = 421614)
 */
function get_domain_separator(chainId) {
    var ARBITRUM_SEPOLIA[32] = [
        151, 202, 237, 197, 125, 207, 194, 174,
        98, 93, 104, 184, 148, 168, 168, 20,
        215, 190, 9, 226, 154, 165, 50, 30,
        235, 173, 162, 66, 52, 16, 217, 208
    ];
    // 0x97caedc57dcfc2ae625d68b894a8a814d7be09e29aa5321eebada2423410d9d0

    var MAINNET[32] = [
        134, 106, 90, 186, 33, 150, 106, 249,
        93, 108, 122, 183, 142, 178, 178, 252,
        145, 57, 21, 194, 139, 227, 185, 170,
        7, 204, 4, 255, 144, 62, 63, 40
    ];
    // 0x866a5aba21966af95d6c7ab78eb2b2fc913915c28be3b9aa07cc04ff903e3f28

    if (chainId == 421614) {
        return ARBITRUM_SEPOLIA;
    }

    return MAINNET;
}


/*
 * Solidity implementation: https://github.com/Uniswap/permit2/blob/cc56ad0f3439c502c246fc5cfcc3db92bb8b7219/src/EIP712.sol#L38
 *
 * @param chainId - Chain ID (Mainnet = 1, Arbitrum Sepolia = 421614)
 */
template HashTypedData(chainId) {
    signal input {byte} permitDigest[32];
    signal output {byte} typedPermitDigest[32];

    var DOMAIN_SEPARATOR = get_domain_separator(chainId);

    

}
