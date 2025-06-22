// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IPermit2} from "permit2/src/interfaces/IPermit2.sol";

interface IWill {
    struct Estate {
        address beneficiary;
        address token;
        uint256 amount;
    }

    event WillExecuted();

    error OnlyExecutor();
    error AlreadyExecuted();
    error TestatorAddressZero();
    error ExecutorAddressZero();
    error BeneficiaryAddressZero();
    error BeneficiaryCannotBeTestator(address beneficiary);
    error InvalidTokenAddress();
    error AmountMustBeGreaterThanZero();

    function permit2() external view returns (IPermit2);

    function testator() external view returns (address);

    function executor() external view returns (address);

    function executed() external view returns (bool);

    function estates(
        uint256 index
    )
        external
        view
        returns (address beneficiary, address token, uint256 amount);

    function getAllEstates() external view returns (Estate[] memory);

    function signatureTransferToBeneficiaries(
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;
}
