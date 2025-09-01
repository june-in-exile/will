pragma circom 2.2.2;

include "./bus.circom";


/*
 * Verifies the permit2 signature contained in the will
 * 
 * The imeplementation corresponds to the contracts deployed
 * at Mainnet 0x000000000022d473030f116ddee9f6b43ac78ba3
 * (SignatureTransfer.sol, ./libraries/PermitHash.sol, etc.)
 */
template VerifyPermit2Signature() {
    signal input {address} testator;   // 20 byte unsigned integer
    input Estate() estates[estateCount];
    signal input {address} will;       // 20 byte unsigned integer
    signal input {uint128} nonce;      // 16 byte (128 bit) unsigned integer
    signal input {uint32} deadline;    // 4 byte (32 bit) unsigned integer
    signal input {byte} signature[signatureBytesLength]; // 65 byte
    signal output {bit} validSignature;

}

/*
 * ECDSA signature generation 
 * 
 * The imeplementation corresponds to the contracts deployed
 * at Mainnet 0x000000000022d473030f116ddee9f6b43ac78ba3
 * (SignatureTransfer.sol, ./libraries/PermitHash.sol, etc.)
 */
template GenerateSignature() {

}



template CreatePermitStructure() {
    signal input {address} testator;   // 20 byte unsigned integer
    input Estate() estates[estateCount];
    signal input {address} will;       // 20 byte unsigned integer
    signal input {uint128} nonce;      // 16 byte (128 bit) unsigned integer
    signal input {uint32} deadline;    // 4 byte (32 bit) unsigned integer
    signal output Permit() permit;

    // createPermitStructure

    // signPermit

}


template HashPermit() {
    // _TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)");
    // = 0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1

    // _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = keccak256(
    //     "PermitBatchTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
    // )
    // = 0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766
    
    // uint256 numPermitted = permit.permitted.length;
    // bytes32[] memory tokenPermissionHashes = new bytes32[](numPermitted);

    // for (uint256 i = 0; i < numPermitted; ++i) {
    //     tokenPermissionHashes[i] = keccak256(abi.encode(_TOKEN_PERMISSIONS_TYPEHASH, permit.permitted[i]));
    // }

    // keccak256(
    //     abi.encode(
    //         _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
    //         keccak256(abi.encodePacked(tokenPermissionHashes)),
    //         will,
    //         nonce,
    //         deadline
    //     )
    // );
}
