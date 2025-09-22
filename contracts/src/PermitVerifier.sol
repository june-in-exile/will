// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
 * @ This contract is kept only for debugging purpose and should not be used in production
 */
contract PermitVerifier {
    /// @notice Thrown when the recovered signer is equal to the zero address
    error InvalidSignature();

    /// @notice Thrown when the recovered signer does not equal the claimedSigner
    error InvalidSigner();

    struct TokenPermissions {
        // ERC20 token address
        address token;
        // the maximum amount that can be spent
        uint256 amount;
    }
    
    struct PermitBatchTransferFrom {
        TokenPermissions[] permitted;
        // a unique value for every token owner's signature to prevent signature replays
        uint256 nonce;
        // deadline on the permit signature
        uint256 deadline;
    }

    bytes32 public constant _TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)");
    bytes32 public constant _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = keccak256(
        "PermitBatchTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
    );
    bytes32 public constant _HASHED_NAME = keccak256("Permit2");
    bytes32 public constant _TYPE_HASH =
        keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice when use anvil, block.chainid is always 31337 no matter forking which chain
    function getChainId() public view returns (uint256) {
        return block.chainid;
    }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(abi.encode(_TYPE_HASH, _HASHED_NAME, block.chainid, address(0x000000000022D473030F116dDEE9F6B43aC78BA3)));
    }

    function hashPermit(PermitBatchTransferFrom calldata permit, address spender) public pure returns (bytes32) {
        uint256 numPermitted = permit.permitted.length;
        bytes32[] memory tokenPermissionHashes = new bytes32[](numPermitted);

        for (uint256 i = 0; i < numPermitted; ++i) {
            tokenPermissionHashes[i] = keccak256(abi.encode(_TOKEN_PERMISSIONS_TYPEHASH, permit.permitted[i]));
        }

        return keccak256(
            abi.encode(
                _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
                keccak256(abi.encodePacked(tokenPermissionHashes)),
                spender,
                permit.nonce,
                permit.deadline
            )
        );
    }

    function hashTypedData(bytes32 permitDigest) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), permitDigest));
    }

    function decodeSignature(bytes calldata signature) public pure returns (bytes32 r, bytes32 s, uint8 v)  {
        (r, s) = abi.decode(signature, (bytes32, bytes32));
        v = uint8(signature[64]);
        
        return (r,s,v);
    }

    function recoverSigner(bytes calldata signature, bytes32 typedPermitDigest) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = decodeSignature(signature);
        address signer = ecrecover(typedPermitDigest, v, r, s);
        return signer;
    }

    function verifyPermit(address testator, PermitBatchTransferFrom calldata permit, address spender, bytes calldata signature) public view {
        bytes32 permitDigest = hashPermit(permit, spender);
        bytes32 typedPermitDigest = hashTypedData(permitDigest);
        address signer = recoverSigner(signature, typedPermitDigest);

        if (signer == address(0)) revert InvalidSignature();
        if (signer != testator) revert InvalidSigner();
    }
}
