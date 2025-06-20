// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "src/Testament.sol";

contract TestamentFuzzTest is Test {
    Testament testament;

    address permit2 = makeAddr("permit2");
    address executor = makeAddr("executor");
    address testator = makeAddr("testator");

    Testament.Estate[] estates;

    function setUp() public {
        // Deploy testament with mock Permit2
        testament = new Testament(permit2, testator, executor, estates);
    }

    function testFuzzConstructorValidEstates(
        address _testator,
        address _executor,
        address _beneficiary,
        address _token,
        uint256 _amount
    ) public {
        vm.assume(_testator != address(0));
        vm.assume(_executor != address(0));
        vm.assume(_beneficiary != address(0));
        vm.assume(_beneficiary != _testator);
        vm.assume(_token != address(0));
        vm.assume(_amount > 0);

        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: _beneficiary,
            token: _token,
            amount: _amount
        });

        Testament newTestament = new Testament(
            permit2,
            _testator,
            _executor,
            newEstates
        );

        assertEq(address(newTestament.permit2()), permit2);
        assertEq(newTestament.testator(), _testator);
        assertEq(newTestament.executor(), _executor);
        assertEq(newTestament.getAllEstates().length, 1);
    }

    function testFuzzSignatureTransferAccessControl(
        address caller,
        uint256 nonce,
        uint256 deadline
    ) public {
        vm.assume(caller != executor);
        vm.assume(nonce != 0);
        vm.assume(deadline > block.timestamp);

        vm.expectRevert(Testament.OnlyExecutor.selector);
        vm.prank(caller);
        testament.signatureTransferToBeneficiaries(nonce, deadline, "");
    }
}
