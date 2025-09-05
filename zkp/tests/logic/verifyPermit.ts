import { keccak256 } from "ethers"
import { ECDSA } from "./cryptography/ecdsa.js"

Accroding to SignatureTransfer.sol and PermitHash.sol, please write a ts script to smulate the behavior of`permitTransferFrom`.The Keccak256 and ECDSA classes are available in @zkp / tests / logic / cryptography
// SignatureTransfer.sol
// PermitHash.sol

struct PermitBatchTransferFrom {
    // the tokens and corresponding amounts permitted for a transfer
    TokenPermissions[] permitted;
    // a unique value for every token owner's signature to prevent signature replays
    uint256 nonce;
    // deadline on the permit signature
    uint256 deadline;
}

struct TokenPermissions {
    // ERC20 token address
    address token;
    // the maximum amount that can be spent
    uint256 amount;
}

struct SignatureTransferDetails {
    // recipient address
    address to;
    // spender requested amount
    uint256 requestedAmount;
}

// PermitHash.sol
function hash(ISignatureTransfer.PermitBatchTransferFrom memory permit) internal view returns(bytes32) {
        uint256 numPermitted = permit.permitted.length;
    bytes32[] memory tokenPermissionHashes = new bytes32[](numPermitted);

    for (uint256 i = 0; i < numPermitted; ++i) {
        tokenPermissionHashes[i] = _hashTokenPermissions(permit.permitted[i]);
    }

    return keccak256(
        abi.encode(
            _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
            keccak256(abi.encodePacked(tokenPermissionHashes)),
            msg.sender,
            permit.nonce,
            permit.deadline
        )
    );
}

_TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)");
// = 0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1

_PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = keccak256(
    "PermitBatchTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
)
// = 0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766
    
uint256 numPermitted = permit.permitted.length;
bytes32[] memory tokenPermissionHashes = new bytes32[](numPermitted);

for (uint256 i = 0; i < numPermitted; ++i) {
    tokenPermissionHashes[i] = keccak256(abi.encode(_TOKEN_PERMISSIONS_TYPEHASH, permit.permitted[i]));
}

keccak256(
    abi.encode(
        _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
        keccak256(abi.encodePacked(tokenPermissionHashes)),
        will,
        nonce,
        deadline
    )
);


function permitTransferFrom(
    PermitBatchTransferFrom memory permit,
    SignatureTransferDetails[] calldata transferDetails,
    address owner,
    bytes calldata signature
) external {
    _permitTransferFrom(permit, transferDetails, owner, permit.hash(), signature);
}








SignatureTransfer.sol
function _permitTransferFrom(
    PermitBatchTransferFrom memory permit,
    SignatureTransferDetails[] calldata transferDetails,
    address owner,
    bytes32 dataHash,
    bytes calldata signature
) private {
        uint256 numPermitted = permit.permitted.length;

    if (block.timestamp > permit.deadline) revert SignatureExpired(permit.deadline);
    if (numPermitted != transferDetails.length) revert LengthMismatch();

    _useUnorderedNonce(owner, permit.nonce);
    signature.verify(_hashTypedData(dataHash), owner);

        unchecked {
        for (uint256 i = 0; i < numPermitted; ++i) {
                TokenPermissions memory permitted = permit.permitted[i];
                uint256 requestedAmount = transferDetails[i].requestedAmount;

            if (requestedAmount > permitted.amount) revert InvalidAmount(permitted.amount);

            if (requestedAmount != 0) {
                // allow spender to specify which of the permitted tokens should be transferred
                ERC20(permitted.token).safeTransferFrom(owner, transferDetails[i].to, requestedAmount);
            }
        }
    }
}

3. 