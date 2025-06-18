// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPermit2, ISignatureTransfer} from "permit2/src/interfaces/IPermit2.sol";

contract Testament {
    IPermit2 public immutable permit2;

    struct Estate {
        address beneficiary;
        address token;
        uint256 amount;
    }

    address public testator;
    address public executor;
    Estate[] public estates;

    // This boolean is used to prevent re-entrancy attacks
    // Can be removed since the nonce brings the same effect
    bool public executed = false;

    event TestamentExecuted();

    error OnlyExecutor();
    error AlreadyExecuted();
    
    error Permit2AddressZero();
    error TestatorAddressZero();
    error ExecutorAddressZero();
    error BeneficiaryAddressZero();
    error BeneficiaryCannotBeTestator(address beneficiary);
    error InvalidTokenAddress();
    error AmountMustBeGreaterThanZero();

    constructor(
        address _permit2,
        address _testator,
        address _executor,
        Estate[] memory _estates
    ) {
        if (_permit2 == address(0)) revert Permit2AddressZero();
        permit2 = IPermit2(_permit2);

        if (_testator == address(0)) revert TestatorAddressZero();
        testator = _testator;

        if (_executor == address(0)) revert ExecutorAddressZero();
        executor = _executor;

        for (uint256 i = 0; i < _estates.length; i++) {
            if (_estates[i].beneficiary == address(0))
                revert BeneficiaryAddressZero();
            if (_estates[i].beneficiary == _testator)
                revert BeneficiaryCannotBeTestator(_estates[i].beneficiary);
            if (_estates[i].token == address(0)) revert InvalidTokenAddress();
            if (_estates[i].amount == 0) revert AmountMustBeGreaterThanZero();
        }
        estates = _estates;
    }

    function getAllEstates() external view returns (Estate[] memory) {
        return estates;
    }

    function signatureTransferToBeneficiaries(
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (msg.sender != executor) revert OnlyExecutor();
        if (executed) revert AlreadyExecuted();

        ISignatureTransfer.TokenPermissions[]
            memory permitted = new ISignatureTransfer.TokenPermissions[](
                estates.length
            );
        for (uint256 i = 0; i < estates.length; i++) {
            permitted[i] = ISignatureTransfer.TokenPermissions({
                token: estates[i].token,
                amount: estates[i].amount
            });
        }
        ISignatureTransfer.PermitBatchTransferFrom
            memory permit = ISignatureTransfer.PermitBatchTransferFrom({
                permitted: permitted,
                nonce: nonce,
                deadline: deadline
            });

        ISignatureTransfer.SignatureTransferDetails[]
            memory transferDetails = new ISignatureTransfer.SignatureTransferDetails[](
                estates.length
            );
        for (uint256 i = 0; i < estates.length; i++) {
            transferDetails[i] = ISignatureTransfer.SignatureTransferDetails({
                to: estates[i].beneficiary,
                requestedAmount: estates[i].amount
            });
        }

        permit2.permitTransferFrom(
            permit,
            transferDetails,
            testator,
            signature
        );

        executed = true;
        emit TestamentExecuted();
    }
}
