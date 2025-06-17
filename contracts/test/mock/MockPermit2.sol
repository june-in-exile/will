// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PermitHash} from "permit2/src/libraries/PermitHash.sol";
import {IPermit2, ISignatureTransfer} from "permit2/src/interfaces/IPermit2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MockPermit2
/// @notice Mock implementation of Permit2 for testing purposes
/// @dev This mock provides simplified implementations for testing contracts that depend on Permit2
contract MockPermit2 is IPermit2 {
    /// @notice Thrown when validating an inputted signature that is stale
    /// @param signatureDeadline The timestamp at which a signature is no longer valid
    error SignatureExpired(uint256 signatureDeadline);

    /// @notice Thrown when validating that the inputted nonce has not been used
    error InvalidNonce();

    using PermitHash for PermitTransferFrom;
    using PermitHash for PermitBatchTransferFrom;

    /// @notice Domain separator for EIP-712
    bytes32 private constant _DOMAIN_SEPARATOR =
        keccak256("MOCK_PERMIT2_DOMAIN");

    /// @notice Mapping to track nonce bitmaps for unordered nonces
    mapping(address => mapping(uint256 => uint256)) public override nonceBitmap;

    /// @notice Mapping to track allowances: owner => token => spender => PackedAllowance
    mapping(address => mapping(address => mapping(address => PackedAllowance)))
        private _allowances;

    /// @notice Control flag to simulate transfer failures for testing
    bool public shouldTransferRevert = false;

    /// @notice Control flag to simulate signature verification failures
    bool public shouldRejectSignature = false;

    /// @notice Event emitted when a mock transfer occurs
    event MockTransfer(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount
    );

    /// @notice Set whether the mock should reject signatures
    function setShouldRejectSignature(bool _shouldReject) external {
        shouldRejectSignature = _shouldReject;
    }

    /// @notice Set whether the mock should revert on transfers
    function setShouldTransferRevert(bool _shouldTransferRevert) external {
        shouldTransferRevert = _shouldTransferRevert;
    }

    /// @notice Returns the domain separator for EIP-712
    function DOMAIN_SEPARATOR() external pure override returns (bytes32) {
        return _DOMAIN_SEPARATOR;
    }

    /// @notice Mock implementation of permitTransferFrom for single token
    function permitTransferFrom(
        PermitTransferFrom memory singlePermit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external override {
        _permitTransferFrom(
            singlePermit,
            transferDetails,
            owner,
            singlePermit.hash(),
            signature
        );
    }

    /// @notice Mock implementation of permitWitnessTransferFrom for single token
    function permitWitnessTransferFrom(
        PermitTransferFrom memory witnessPermit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes32 witness,
        string calldata witnessTypeString,
        bytes calldata signature
    ) external override {
        _permitTransferFrom(
            witnessPermit,
            transferDetails,
            owner,
            witnessPermit.hashWithWitness(witness, witnessTypeString),
            signature
        );
    }

    function _permitTransferFrom(
        PermitTransferFrom memory singlePermit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes32,
        bytes calldata
    ) private {
        if (block.timestamp > singlePermit.deadline)
            revert SignatureExpired(singlePermit.deadline);

        if (transferDetails.requestedAmount > singlePermit.permitted.amount) {
            revert InvalidAmount(singlePermit.permitted.amount);
        }

        _useUnorderedNonce(owner, singlePermit.nonce);

        if (shouldRejectSignature) {
            revert("MockPermit2: Invalid signature");
        }

        if (shouldTransferRevert) {
            revert("MockPermit2: Transfer reverted");
        }

        // Perform the mock transfer
        _mockTransfer(
            owner,
            transferDetails.to,
            singlePermit.permitted.token,
            transferDetails.requestedAmount
        );

        emit MockTransfer(
            owner,
            transferDetails.to,
            singlePermit.permitted.token,
            transferDetails.requestedAmount
        );
    }

    /// @notice Mock implementation of permitTransferFrom for batch tokens
    function permitTransferFrom(
        PermitBatchTransferFrom memory batchPermit,
        SignatureTransferDetails[] calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external override {
        _permitTransferFrom(
            batchPermit,
            transferDetails,
            owner,
            batchPermit.hash(),
            signature
        );
    }

    /// @notice Mock implementation of permitWitnessTransferFrom for batch tokens
    function permitWitnessTransferFrom(
        PermitBatchTransferFrom memory batchWitnessPermit,
        SignatureTransferDetails[] calldata transferDetails,
        address owner,
        bytes32 witness,
        string calldata witnessTypeString,
        bytes calldata signature
    ) external override {
        _permitTransferFrom(
            batchWitnessPermit,
            transferDetails,
            owner,
            batchWitnessPermit.hashWithWitness(witness, witnessTypeString),
            signature
        );
    }

    function _permitTransferFrom(
        PermitBatchTransferFrom memory batchPermit,
        SignatureTransferDetails[] calldata transferDetails,
        address owner,
        bytes32,
        bytes calldata
    ) private {
        uint256 numPermitted = batchPermit.permitted.length;

        if (block.timestamp > batchPermit.deadline)
            revert SignatureExpired(batchPermit.deadline);
        if (numPermitted != transferDetails.length) revert LengthMismatch();

        _useUnorderedNonce(owner, batchPermit.nonce);
        if (shouldRejectSignature) {
            revert("MockPermit2: Invalid signature");
        }

        if (shouldTransferRevert) {
            revert("MockPermit2: Transfer reverted");
        }

        unchecked {
            for (uint256 i = 0; i < numPermitted; ++i) {
                TokenPermissions memory permitted = batchPermit.permitted[i];
                uint256 requestedAmount = transferDetails[i].requestedAmount;

                if (requestedAmount > permitted.amount)
                    revert InvalidAmount(permitted.amount);

                if (requestedAmount != 0) {
                    _mockTransfer(
                        owner,
                        transferDetails[i].to,
                        permitted.token,
                        requestedAmount
                    );

                    emit MockTransfer(
                        owner,
                        transferDetails[i].to,
                        permitted.token,
                        requestedAmount
                    );
                }
            }
        }
    }

    /// @notice Mock implementation of invalidateUnorderedNonces
    function invalidateUnorderedNonces(
        uint256 wordPos,
        uint256 mask
    ) external override {
        require(wordPos <= type(uint248).max, "MockPermit2: WordPos too large");

        nonceBitmap[msg.sender][wordPos] |= mask;

        emit UnorderedNonceInvalidation(msg.sender, wordPos, mask);
    }

    /// @notice Returns the index of the bitmap and the bit position within the bitmap. Used for unordered nonces
    /// @param nonce The nonce to get the associated word and bit positions
    /// @return wordPos The word position or index into the nonceBitmap
    /// @return bitPos The bit position
    /// @dev The first 248 bits of the nonce value is the index of the desired bitmap
    /// @dev The last 8 bits of the nonce value is the position of the bit in the bitmap
    function bitmapPositions(
        uint256 nonce
    ) private pure returns (uint256 wordPos, uint256 bitPos) {
        wordPos = uint248(nonce >> 8);
        bitPos = uint8(nonce);
    }

    /// @notice Checks whether a nonce is taken and sets the bit at the bit position in the bitmap at the word position
    /// @param from The address to use the nonce at
    /// @param nonce The nonce to spend
    function _useUnorderedNonce(address from, uint256 nonce) internal {
        (uint256 wordPos, uint256 bitPos) = bitmapPositions(nonce);
        uint256 bit = 1 << bitPos;
        uint256 flipped = nonceBitmap[from][wordPos] ^= bit;

        if (flipped & bit == 0) revert InvalidNonce();
    }

    // ===== AllowanceTransfer Implementation =====

    /// @notice Get allowance information
    function allowance(
        address user,
        address token,
        address spender
    )
        external
        view
        override
        returns (uint160 amount, uint48 expiration, uint48 nonce)
    {
        PackedAllowance memory packed = _allowances[user][token][spender];
        return (packed.amount, packed.expiration, packed.nonce);
    }

    /// @notice Mock implementation of approve
    function approve(
        address token,
        address spender,
        uint160 amount,
        uint48 expiration
    ) external override {
        _allowances[msg.sender][token][spender] = PackedAllowance({
            amount: amount,
            expiration: expiration,
            nonce: _allowances[msg.sender][token][spender].nonce
        });

        emit Approval(msg.sender, token, spender, amount, expiration);
    }

    /// @notice Mock implementation of permit for single token
    function permit(
        address owner,
        PermitSingle memory permitSingle,
        bytes calldata
    ) external override {
        if (shouldRejectSignature) {
            revert("MockPermit2: Invalid signature");
        }

        require(
            block.timestamp <= permitSingle.sigDeadline,
            "MockPermit2: Signature deadline exceeded"
        );

        _allowances[owner][permitSingle.details.token][
            permitSingle.spender
        ] = PackedAllowance({
            amount: permitSingle.details.amount,
            expiration: permitSingle.details.expiration,
            nonce: permitSingle.details.nonce
        });

        emit Permit(
            owner,
            permitSingle.details.token,
            permitSingle.spender,
            permitSingle.details.amount,
            permitSingle.details.expiration,
            permitSingle.details.nonce
        );
    }

    /// @notice Mock implementation of permit for batch tokens
    function permit(
        address owner,
        PermitBatch memory permitBatch,
        bytes calldata
    ) external override {
        if (shouldRejectSignature) {
            revert("MockPermit2: Invalid signature");
        }

        require(
            block.timestamp <= permitBatch.sigDeadline,
            "MockPermit2: Signature deadline exceeded"
        );

        for (uint256 i = 0; i < permitBatch.details.length; i++) {
            PermitDetails memory details = permitBatch.details[i];

            _allowances[owner][details.token][
                permitBatch.spender
            ] = PackedAllowance({
                amount: details.amount,
                expiration: details.expiration,
                nonce: details.nonce
            });

            emit Permit(
                owner,
                details.token,
                permitBatch.spender,
                details.amount,
                details.expiration,
                details.nonce
            );
        }
    }

    /// @notice Mock implementation of transferFrom
    function transferFrom(
        address from,
        address to,
        uint160 amount,
        address token
    ) external override {
        if (shouldTransferRevert) {
            revert("MockPermit2: Transfer reverted");
        }

        PackedAllowance storage allowed = _allowances[from][token][msg.sender];

        if (block.timestamp > allowed.expiration) {
            revert AllowanceExpired(allowed.expiration);
        }

        if (allowed.amount < amount) {
            revert InsufficientAllowance(allowed.amount);
        }

        // Decrease allowance if not unlimited
        if (allowed.amount != type(uint160).max) {
            allowed.amount -= amount;
        }

        _mockTransfer(from, to, token, amount);

        emit MockTransfer(from, to, token, amount);
    }

    /// @notice Mock implementation of batch transferFrom
    function transferFrom(
        AllowanceTransferDetails[] calldata transferDetails
    ) external override {
        if (shouldTransferRevert) {
            revert("MockPermit2: Transfer reverted");
        }

        for (uint256 i = 0; i < transferDetails.length; i++) {
            AllowanceTransferDetails memory details = transferDetails[i];

            PackedAllowance storage allowed = _allowances[details.from][
                details.token
            ][msg.sender];

            if (block.timestamp > allowed.expiration) {
                revert AllowanceExpired(allowed.expiration);
            }

            if (allowed.amount < details.amount) {
                revert InsufficientAllowance(allowed.amount);
            }

            // Decrease allowance if not unlimited
            if (allowed.amount != type(uint160).max) {
                allowed.amount -= details.amount;
            }

            _mockTransfer(
                details.from,
                details.to,
                details.token,
                details.amount
            );

            emit MockTransfer(
                details.from,
                details.to,
                details.token,
                details.amount
            );
        }
    }

    /// @notice Mock implementation of lockdown
    function lockdown(TokenSpenderPair[] calldata approvals) external override {
        for (uint256 i = 0; i < approvals.length; i++) {
            _allowances[msg.sender][approvals[i].token][
                approvals[i].spender
            ] = PackedAllowance({amount: 0, expiration: 0, nonce: 0});

            emit Lockdown(msg.sender, approvals[i].token, approvals[i].spender);
        }
    }

    /// @notice Mock implementation of invalidateNonces
    function invalidateNonces(
        address token,
        address spender,
        uint48 newNonce
    ) external override {
        PackedAllowance storage allowed = _allowances[msg.sender][token][
            spender
        ];
        uint48 oldNonce = allowed.nonce;

        if (newNonce <= oldNonce) {
            revert("MockPermit2: Invalid nonce");
        }

        if (newNonce - oldNonce > type(uint16).max) {
            revert ExcessiveInvalidation();
        }

        allowed.nonce = newNonce;

        emit NonceInvalidation(msg.sender, token, spender, newNonce, oldNonce);
    }

    /// @notice Internal function to simulate token transfer
    /// @dev In a real implementation, this would call the actual ERC20 transfer
    function _mockTransfer(
        address from,
        address to,
        address token,
        uint256 amount
    ) internal {
        // In testing, you might want to actually perform the transfer
        // IERC20(token).transferFrom(from, to, amount);
        // For now, we just emit an event to indicate the transfer would have happened
        // You can override this behavior in your tests if needed
    }

    /// @notice Helper function to set up mock allowances for testing
    function setMockAllowance(
        address owner,
        address token,
        address spender,
        uint160 amount,
        uint48 expiration,
        uint48 nonce
    ) external {
        _allowances[owner][token][spender] = PackedAllowance({
            amount: amount,
            expiration: expiration,
            nonce: nonce
        });
    }

    /// @notice Helper function to get mock allowance for testing
    function getMockAllowance(
        address owner,
        address token,
        address spender
    ) external view returns (PackedAllowance memory) {
        return _allowances[owner][token][spender];
    }
}
