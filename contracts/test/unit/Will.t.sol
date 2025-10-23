// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "src/Will.sol";
import "mock/MockContracts.sol";

contract WillUnitTest is Test {
    Will will;
    MockERC20 token0;
    MockERC20 token1;

    MockPermit2 mockPermit2;

    address testator = makeAddr("testator");
    address oracle = makeAddr("oracle");
    address executor = makeAddr("executor");
    address beneficiary0 = makeAddr("beneficiary0");
    address beneficiary1 = makeAddr("beneficiary1");

    Will.Estate[] estates;

    function setUp() public {
        mockPermit2 = new MockPermit2();

        token0 = new MockERC20("Token1", "TK1");
        token1 = new MockERC20("Token2", "TK2");

        estates.push(Will.Estate({ beneficiary: beneficiary0, token: address(token0), amount: 1000e18 }));
        estates.push(Will.Estate({ beneficiary: beneficiary1, token: address(token1), amount: 500e18 }));

        will = new Will(address(mockPermit2), testator, oracle, executor, estates);

        token0.mint(testator, 10000e18);
        token1.mint(testator, 5000e18);
    }

    // Constructor Tests
    function test_ConstructorSuccess() public {
        Will.Estate[] memory newEstates = new Will.Estate[](1);
        newEstates[0] = Will.Estate({ beneficiary: beneficiary0, token: address(token0), amount: 100e18 });

        Will newWill = new Will(address(mockPermit2), testator, oracle, executor, newEstates);

        assertEq(newWill.testator(), testator);
        assertEq(newWill.executor(), executor);
        assertEq(address(newWill.permit2()), address(mockPermit2));

        Will.Estate[] memory retrievedEstates = newWill.getAllEstates();
        assertEq(retrievedEstates.length, 1);
        assertEq(retrievedEstates[0].beneficiary, beneficiary0);
        assertEq(retrievedEstates[0].token, address(token0));
        assertEq(retrievedEstates[0].amount, 100e18);
    }

    function test_ConstructorFails() public {
        Will.Estate[] memory _estates = new Will.Estate[](1);
        _estates[0] = Will.Estate({ beneficiary: beneficiary0, token: address(token0), amount: 1000e18 });

        // Test zero address validations
        vm.expectRevert(Will.Permit2AddressZero.selector);
        new Will(address(0), testator, oracle, executor, _estates);

        vm.expectRevert(Will.TestatorAddressZero.selector);
        new Will(address(mockPermit2), address(0), oracle, executor, _estates);

        vm.expectRevert(Will.OracleAddressZero.selector);
        new Will(address(mockPermit2), testator, address(0), executor, _estates);

        vm.expectRevert(Will.ExecutorAddressZero.selector);
        new Will(address(mockPermit2), testator, oracle, address(0), _estates);

        // Test beneficiary cannot be testator
        _estates[0].beneficiary = testator;
        vm.expectRevert(abi.encodeWithSelector(Will.BeneficiaryCannotBeTestator.selector, testator));
        new Will(address(mockPermit2), testator, oracle, executor, _estates);

        // Test zero beneficiary address
        _estates[0].beneficiary = address(0);
        vm.expectRevert(Will.BeneficiaryAddressZero.selector);
        new Will(address(mockPermit2), testator, oracle, executor, _estates);

        // Test invalid token address
        _estates[0].beneficiary = beneficiary0;
        _estates[0].token = address(0);
        vm.expectRevert(Will.InvalidTokenAddress.selector);
        new Will(address(mockPermit2), testator, oracle, executor, _estates);

        // Test zero amount
        _estates[0].token = address(token0);
        _estates[0].amount = 0;
        vm.expectRevert(Will.AmountMustBeGreaterThanZero.selector);
        new Will(address(mockPermit2), testator, oracle, executor, _estates);
    }

    // View Functions Tests
    function test_GetAllEstates() public view {
        Will.Estate[] memory retrievedEstates = will.getAllEstates();

        assertEq(retrievedEstates.length, 2);

        assertEq(retrievedEstates[0].beneficiary, beneficiary0);
        assertEq(retrievedEstates[0].token, address(token0));
        assertEq(retrievedEstates[0].amount, 1000e18);

        assertEq(retrievedEstates[1].beneficiary, beneficiary1);
        assertEq(retrievedEstates[1].token, address(token1));
        assertEq(retrievedEstates[1].amount, 500e18);
    }

    function test_EstatesPublicGetter() public view {
        (address beneficiary, address token, uint256 amount) = will.estates(0);

        assertEq(beneficiary, beneficiary0);
        assertEq(token, address(token0));
        assertEq(amount, 1000e18);
    }

    // Transfer Tests
    function test_SignatureTransferSuccess() public {
        vm.expectEmit(false, false, false, false);
        emit Will.Probated();

        vm.prank(oracle);
        will.probateWill();

        vm.expectEmit(true, true, true, true);
        emit MockPermit2.MockTransfer(testator, beneficiary0, address(token0), 1000e18);

        vm.expectEmit(true, true, true, true);
        emit MockPermit2.MockTransfer(testator, beneficiary1, address(token1), 500e18);

        vm.expectEmit(false, false, false, false);
        emit Will.WillExecuted();

        vm.prank(executor);
        will.signatureTransferToBeneficiaries(0, block.timestamp + 1000, "signature");
    }

    function test_SignatureTransferFailsNotProbated() public {
        vm.expectRevert(Will.NotProbated.selector);
        vm.prank(executor);
        will.signatureTransferToBeneficiaries(0, block.timestamp + 1000, "signature0");
    }

    function test_SignatureTransferFailsWithExpiredDeadline() public {
        vm.prank(oracle);
        will.probateWill();
        
        vm.expectRevert(abi.encodeWithSelector(MockPermit2.SignatureExpired.selector, block.timestamp - 1));
        vm.prank(executor);
        will.signatureTransferToBeneficiaries(1, block.timestamp - 1, "signature");
    }

    function test_SignatureTransferFailsInvalidSignature() public {
        vm.prank(oracle);
        will.probateWill();

        mockPermit2.setShouldRejectSignature(true);

        vm.expectRevert("MockPermit2: Invalid signature");
        vm.prank(executor);
        will.signatureTransferToBeneficiaries(0, block.timestamp + 1000, "signature");
    }

    function test_SignatureTransferFailsWithTransferReverted() public {
        vm.prank(oracle);
        will.probateWill();

        mockPermit2.setShouldTransferRevert(true);

        vm.expectRevert("MockPermit2: Transfer reverted");
        vm.prank(executor);
        will.signatureTransferToBeneficiaries(0, block.timestamp + 1000, "signature");
    }

    // Edge Cases
    function test_EmptyEstatesArray() public {
        Will.Estate[] memory emptyEstates = new Will.Estate[](0);
        Will emptyWill = new Will(address(mockPermit2), testator, oracle, executor, emptyEstates);

        assertEq(emptyWill.getAllEstates().length, 0);
    }

    function test_MultipleEstatesSameBeneficiary() public {
        Will.Estate[] memory sameEstates = new Will.Estate[](2);
        sameEstates[0] = Will.Estate({ beneficiary: beneficiary0, token: address(token0), amount: 100e18 });
        sameEstates[1] = Will.Estate({ beneficiary: beneficiary0, token: address(token1), amount: 200e18 });

        Will sameWill = new Will(address(mockPermit2), testator, oracle, executor, sameEstates);
        Will.Estate[] memory retrieved = sameWill.getAllEstates();

        assertEq(retrieved.length, 2);
        assertEq(retrieved[0].beneficiary, beneficiary0);
        assertEq(retrieved[1].beneficiary, beneficiary0);
    }

    function test_MultipleEstatesSameToken() public {
        Will.Estate[] memory sameTokenEstates = new Will.Estate[](2);
        sameTokenEstates[0] = Will.Estate({ beneficiary: beneficiary0, token: address(token0), amount: 100e18 });
        sameTokenEstates[1] = Will.Estate({ beneficiary: beneficiary1, token: address(token0), amount: 200e18 });

        Will sameTokenWill = new Will(address(mockPermit2), testator, oracle, executor, sameTokenEstates);
        Will.Estate[] memory retrieved = sameTokenWill.getAllEstates();

        assertEq(retrieved.length, 2);
        assertEq(retrieved[0].token, address(token0));
        assertEq(retrieved[1].token, address(token0));
    }
}
