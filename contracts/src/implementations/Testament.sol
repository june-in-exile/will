// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPermit2, ISignatureTransfer} from "src/interfaces/IPermit2.sol";

using SafeERC20 for IERC20;

contract Testament {
    IPermit2 public immutable permit2 = IPermit2(0x000000000022D473030F116dDEE9F6B43aC78BA3);

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

    event testamentExecuted();

    constructor(address _testator, address _executor, Estate[] memory _estates) {
        require(_testator != address(0), "Testator address cannot be zero");
        testator = _testator;

        require(_executor != address(0), "Executor address cannot be zero");
        executor = _executor;

        for (uint256 i = 0; i < estates.length; i++) {
            require(_estates[i].beneficiary != address(0), "Invalid beneficiary address");
            require(_estates[i].beneficiary != _testator, "Beneficiary and testator cannot be the same");
            require(_estates[i].token != address(0), "Invalid token address");
            require(_estates[i].amount > 0, "Amount must be greater than zero");
        }
        estates = _estates;
    }

    function signatureTransferToBeneficiaries(uint256 nonce, uint256 deadline, bytes calldata signature) external {
        require(msg.sender == executor, "Only executor can execute the testament");
        require(!executed, "Transfer has already been executed");

        require(nonce > 0, "Nonce must be greater than zero");
        require(deadline > block.timestamp, "Deadline must be in the future");

        // FIX: should add up the balances of the same token first
        for (uint256 i = 0; i < estates.length; i++) {
            require(
                IERC20(estates[i].token).balanceOf(testator) >= estates[i].amount,
                "Testator does not have enough tokens"
            );
        }

        ISignatureTransfer.TokenPermissions[] memory permitted =
            new ISignatureTransfer.TokenPermissions[](estates.length);
        for (uint256 i = 0; i < estates.length; i++) {
            permitted[i] = ISignatureTransfer.TokenPermissions({token: estates[i].token, amount: estates[i].amount});
        }
        ISignatureTransfer.PermitBatchTransferFrom memory permit =
            ISignatureTransfer.PermitBatchTransferFrom({permitted: permitted, nonce: nonce, deadline: deadline});

        ISignatureTransfer.SignatureTransferDetails[] memory transferDetails =
            new ISignatureTransfer.SignatureTransferDetails[](estates.length);
        for (uint256 i = 0; i < estates.length; i++) {
            transferDetails[i] = ISignatureTransfer.SignatureTransferDetails({
                to: estates[i].beneficiary,
                requestedAmount: estates[i].amount
            });
        }

        permit2.permitTransferFrom(permit, transferDetails, testator, signature);

        executed = true;
        emit testamentExecuted();
    }
}
