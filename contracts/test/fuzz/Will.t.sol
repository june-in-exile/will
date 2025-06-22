// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "src/Will.sol";

contract WillFuzzTest is Test {
    Will will;

    address permit2 = makeAddr("permit2");
    address executor = makeAddr("executor");
    address testator = makeAddr("testator");

    Will.Estate[] estates;

    function setUp() public {
        // Deploy will with mock Permit2
        will = new Will(permit2, testator, executor, estates);
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

        Will.Estate[] memory newEstates = new Will.Estate[](1);
        newEstates[0] = Will.Estate({
            beneficiary: _beneficiary,
            token: _token,
            amount: _amount
        });

        Will newWill = new Will(permit2, _testator, _executor, newEstates);

        assertEq(address(newWill.permit2()), permit2);
        assertEq(newWill.testator(), _testator);
        assertEq(newWill.executor(), _executor);
        assertEq(newWill.getAllEstates().length, 1);
    }

    function testFuzzSignatureTransferAccessControl(
        address caller,
        uint256 nonce,
        uint256 deadline
    ) public {
        vm.assume(caller != executor);
        vm.assume(nonce != 0);
        vm.assume(deadline > block.timestamp);

        vm.expectRevert(Will.OnlyExecutor.selector);
        vm.prank(caller);
        will.signatureTransferToBeneficiaries(nonce, deadline, "");
    }
}
