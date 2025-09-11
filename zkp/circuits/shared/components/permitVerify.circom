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
    signal output {bit} permitDigest[256];

    // 0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1
    var TOKEN_PERMISSIONS_TYPEHASH[256] = [
        1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1,
        1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1,
        0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0,
        1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1,
        0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0,
        1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0,
        1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0,
        0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1,
        0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1,
        0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0,
        0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1,
        0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0,
        0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1
    ];

    // 0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766
    var PERMIT_BATCH_TRANSFER_FROM_TYPEHASH[256] = [
        0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0,
        0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 
        0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1,
        0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1,
        0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1,
        0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0,
        0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0,
        0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0,
        1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0,
        1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1,
        0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1,
        1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0,
        1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0
    ];

    signal {bit} bitsTokens[numPermission][256];
    signal {bit} bitsAmounts[numPermission][256];

    signal {bit} bitsTokenPermissions[numPermission][3 * 256];
    signal {bit} bitsTokenPermissionDigests[numPermission][256];

    var tokenPermissionBits = 3 * 256;

    for (var i = 0; i < numPermission; i++) {
        // Converts token address and amount from number to bytes (big-endian), and then to bits (LSB-first)
        // @note This is not the same as Num2Bits(256)(value)
        bitsTokens[i] <== BytesToBits(32, 1)(NumToBytes(32, 0)(permit.permitted[i].token));
        bitsAmounts[i] <== BytesToBits(32, 1)(NumToBytes(32, 0)(permit.permitted[i].amount));

        // Gets token permission by encoding TOKEN_PERMISSIONS_TYPEHASH, permitted[i].token, permitted[i].amount
        for (var j = 0; j < 256; j++) {
            bitsTokenPermissions[i][j] <== TOKEN_PERMISSIONS_TYPEHASH[j];
            bitsTokenPermissions[i][j + 256] <== bitsTokens[i][j];
            bitsTokenPermissions[i][j + 512] <== bitsAmounts[i][j];
        }
        
        // Hashes token permission
        bitsTokenPermissionDigests[i] <== Keccak256(tokenPermissionBits)(bitsTokenPermissions[i]);
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

    // Converts spender, nonce and deadline from number to bytes (big-endian), and then to bits (LSB-first)
    // @note This is not the same as Num2Bits(256)(value)
    signal {bit} bitsSpender[256] <== BytesToBits(32, 1)(NumToBytes(32, 0)(spender));
    signal {bit} bitsNonce[256] <== BytesToBits(32, 1)(NumToBytes(32, 0)(permit.nonce));
    signal {bit} bitsDeadline[256] <== BytesToBits(32, 1)(NumToBytes(32, 0)(permit.deadline));

    // Gets batch permit by encoding PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, digest of concated token permission digests, spender, nonce, deadline
    var batchPermitBits = 5 * 256;
    signal {bit} bitsBatchPermit[batchPermitBits];
    for (var i = 0; i < 256; i++) {
        bitsBatchPermit[i] <== PERMIT_BATCH_TRANSFER_FROM_TYPEHASH[i];
        bitsBatchPermit[i + 256] <== bitsPermissionsDigest[i];
        bitsBatchPermit[i + 512] <== bitsSpender[i];
        bitsBatchPermit[i + 768] <== bitsNonce[i];
        bitsBatchPermit[i + 1024] <== bitsDeadline[i];
    }

    // Hashes batch permit
    permitDigest <== Keccak256(batchPermitBits)(bitsBatchPermit);
}


/*
 * The DOMAIN_SEPARATOR can be queried permit2 contract (fixed address: 0x000000000022d473030f116ddee9f6b43ac78ba3)
 *   - Mainnet: https://etherscan.io/address/0x000000000022d473030f116ddee9f6b43ac78ba3#readContract#F1
 *   - Arbitrum Sepolia: https://sepolia.arbiscan.io/address/0x000000000022d473030f116ddee9f6b43ac78ba3#readContract#F1
 *
 * @param chainId - Chain ID (Mainnet = 1, Arbitrum Sepolia = 421614)
 */
function EIP712_DOMAIN_SEPARATOR(chainId) {
    var ARBITRUM_SEPOLIA[256] = [
        1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1,
        1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1,
        1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1,
        0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1,
        0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0,
        0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1,
        0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0,
        1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1,
        1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1,
        0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1,
        0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
        1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1,
        0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0,
        0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
        1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1
    ];
    // 0x97caedc57dcfc2ae625d68b894a8a814d7be09e29aa5321eebada2423410d9d0

    var MAINNET[256] = [
        0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0,
        0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1,
        1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1,
        0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1,
        1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0,
        0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1,
        0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1,
        0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1,
        1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0,
        1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1,
        1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1,
        1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
        1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1,
        0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1,
        0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0,
        1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0
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
    signal input {bit} permitDigest[256];
    signal output {bit} typedPermitDigest[256];

    // abi.encodePacked("0x1901", DOMAIN_SEPARATOR, permitDigest)
    var BITS_PREFIX[2 * 8] = [1,0,0,1,1,0,0,0,1,0,0,0,0,0,0,0];
    var BITS_DOMAIN_SEPARATOR[32 * 8] = EIP712_DOMAIN_SEPARATOR(chainId);

    var totalBits = (2 + 32 + 32) * 8;
    signal {bit} encodedDigest[totalBits];

    var bitIdx = 0;
    for (var i = 0; i < 2 * 8; i++) {
        encodedDigest[bitIdx] <== BITS_PREFIX[i];
        bitIdx++;
    }
    for (var i = 0; i < 32 * 8; i++) {
        encodedDigest[bitIdx] <== BITS_DOMAIN_SEPARATOR[i];
        bitIdx++;
    }
    for (var i = 0; i < 32 * 8; i++) {
        encodedDigest[bitIdx] <== permitDigest[i];
        bitIdx++;
    }
    assert(bitIdx == totalBits);

    // keccak256(encodedValue)
    typedPermitDigest <== Keccak256(totalBits)(encodedDigest);
}
