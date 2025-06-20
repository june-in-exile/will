// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "src/Testament.sol";
import "mock/MockContracts.sol";

contract TestamentUnitTest is Test {
    Testament testament;
    MockERC20 token0;
    MockERC20 token1;

    MockPermit2 mockPermit2;

    address testator = makeAddr("testator");
    address executor = makeAddr("executor");
    address beneficiary0 = makeAddr("beneficiary0");
    address beneficiary1 = makeAddr("beneficiary1");

    Testament.Estate[] estates;

    function setUp() public {
        mockPermit2 = new MockPermit2();

        token0 = new MockERC20("Token1", "TK1");
        token1 = new MockERC20("Token2", "TK2");

        estates.push(
            Testament.Estate({
                beneficiary: beneficiary0,
                token: address(token0),
                amount: 1000e18
            })
        );
        estates.push(
            Testament.Estate({
                beneficiary: beneficiary1,
                token: address(token1),
                amount: 500e18
            })
        );

        testament = new Testament(
            address(mockPermit2),
            testator,
            executor,
            estates
        );

        token0.mint(testator, 10000e18);
        token1.mint(testator, 5000e18);
    }

    // Constructor Tests
    function test_ConstructorSuccess() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: beneficiary0,
            token: address(token0),
            amount: 100e18
        });

        Testament newTestament = new Testament(
            address(mockPermit2),
            testator,
            executor,
            newEstates
        );

        assertEq(newTestament.testator(), testator);
        assertEq(newTestament.executor(), executor);
        assertEq(address(newTestament.permit2()), address(mockPermit2));

        Testament.Estate[] memory retrievedEstates = newTestament
            .getAllEstates();
        assertEq(retrievedEstates.length, 1);
        assertEq(retrievedEstates[0].beneficiary, beneficiary0);
        assertEq(retrievedEstates[0].token, address(token0));
        assertEq(retrievedEstates[0].amount, 100e18);
    }

    function test_ConstructorFails() public {
        Testament.Estate[] memory _estates = new Testament.Estate[](1);
        _estates[0] = Testament.Estate({
            beneficiary: beneficiary0,
            token: address(token0),
            amount: 1000e18
        });

        // Test zero address validations
        vm.expectRevert(Testament.Permit2AddressZero.selector);
        new Testament(address(0), testator, executor, _estates);

        vm.expectRevert(Testament.TestatorAddressZero.selector);
        new Testament(address(mockPermit2), address(0), executor, _estates);

        vm.expectRevert(Testament.ExecutorAddressZero.selector);
        new Testament(address(mockPermit2), testator, address(0), _estates);

        // Test beneficiary cannot be testator
        _estates[0].beneficiary = testator;
        vm.expectRevert(
            abi.encodeWithSelector(
                Testament.BeneficiaryCannotBeTestator.selector,
                testator
            )
        );
        new Testament(address(mockPermit2), testator, executor, _estates);

        // Test zero beneficiary address
        _estates[0].beneficiary = address(0);
        vm.expectRevert(Testament.BeneficiaryAddressZero.selector);
        new Testament(address(mockPermit2), testator, executor, _estates);

        // Test invalid token address
        _estates[0].beneficiary = beneficiary0;
        _estates[0].token = address(0);
        vm.expectRevert(Testament.InvalidTokenAddress.selector);
        new Testament(address(mockPermit2), testator, executor, _estates);

        // Test zero amount
        _estates[0].token = address(token0);
        _estates[0].amount = 0;
        vm.expectRevert(Testament.AmountMustBeGreaterThanZero.selector);
        new Testament(address(mockPermit2), testator, executor, _estates);
    }

    // View Functions Tests
    function test_GetAllEstates() public view {
        Testament.Estate[] memory retrievedEstates = testament.getAllEstates();

        assertEq(retrievedEstates.length, 2);

        assertEq(retrievedEstates[0].beneficiary, beneficiary0);
        assertEq(retrievedEstates[0].token, address(token0));
        assertEq(retrievedEstates[0].amount, 1000e18);

        assertEq(retrievedEstates[1].beneficiary, beneficiary1);
        assertEq(retrievedEstates[1].token, address(token1));
        assertEq(retrievedEstates[1].amount, 500e18);
    }

    function test_EstatesPublicGetter() public view {
        (address beneficiary, address token, uint256 amount) = testament
            .estates(0);

        assertEq(beneficiary, beneficiary0);
        assertEq(token, address(token0));
        assertEq(amount, 1000e18);
    }

    // Transfer Tests
    function test_SignatureTransferSuccess() public {
        assertFalse(testament.executed());

        vm.expectEmit(true, true, true, true);
        emit MockPermit2.MockTransfer(
            testator,
            beneficiary0,
            address(token0),
            1000e18
        );

        vm.expectEmit(true, true, true, true);
        emit MockPermit2.MockTransfer(
            testator,
            beneficiary1,
            address(token1),
            500e18
        );

        vm.expectEmit(true, false, false, false);
        emit Testament.TestamentExecuted();

        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(
            0,
            block.timestamp + 1000,
            "signature"
        );

        assertTrue(testament.executed());
    }

    function test_SignatureTransferFailsWithExpiredDeadline() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                MockPermit2.SignatureExpired.selector,
                block.timestamp - 1
            )
        );
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(
            1,
            block.timestamp - 1,
            "signature"
        );
    }

    function test_SignatureTransferFailsAlreadyExecuted() public {
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(
            0,
            block.timestamp + 1000,
            "signature0"
        );

        vm.expectRevert(Testament.AlreadyExecuted.selector);
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(
            0,
            block.timestamp + 1000,
            "signature0"
        );
    }

    function test_SignatureTransferFailsInvalidSignature() public {
        mockPermit2.setShouldRejectSignature(true);

        vm.expectRevert("MockPermit2: Invalid signature");
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(
            0,
            block.timestamp + 1000,
            "signature"
        );
    }

    function test_SignatureTransferFailsWithTransferReverted() public {
        mockPermit2.setShouldTransferRevert(true);

        vm.expectRevert("MockPermit2: Transfer reverted");
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(
            0,
            block.timestamp + 1000,
            "signature"
        );
    }

    // Edge Cases
    function test_EmptyEstatesArray() public {
        Testament.Estate[] memory emptyEstates = new Testament.Estate[](0);
        Testament emptyTestament = new Testament(
            address(mockPermit2),
            testator,
            executor,
            emptyEstates
        );

        assertEq(emptyTestament.getAllEstates().length, 0);
    }

    function test_MultipleEstatesSameBeneficiary() public {
        Testament.Estate[] memory sameEstates = new Testament.Estate[](2);
        sameEstates[0] = Testament.Estate({
            beneficiary: beneficiary0,
            token: address(token0),
            amount: 100e18
        });
        sameEstates[1] = Testament.Estate({
            beneficiary: beneficiary0,
            token: address(token1),
            amount: 200e18
        });

        Testament sameTestament = new Testament(
            address(mockPermit2),
            testator,
            executor,
            sameEstates
        );
        Testament.Estate[] memory retrieved = sameTestament.getAllEstates();

        assertEq(retrieved.length, 2);
        assertEq(retrieved[0].beneficiary, beneficiary0);
        assertEq(retrieved[1].beneficiary, beneficiary0);
    }

    function test_MultipleEstatesSameToken() public {
        Testament.Estate[] memory sameTokenEstates = new Testament.Estate[](2);
        sameTokenEstates[0] = Testament.Estate({
            beneficiary: beneficiary0,
            token: address(token0),
            amount: 100e18
        });
        sameTokenEstates[1] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token0),
            amount: 200e18
        });

        Testament sameTokenTestament = new Testament(
            address(mockPermit2),
            testator,
            executor,
            sameTokenEstates
        );
        Testament.Estate[] memory retrieved = sameTokenTestament
            .getAllEstates();

        assertEq(retrieved.length, 2);
        assertEq(retrieved[0].token, address(token0));
        assertEq(retrieved[1].token, address(token0));
    }
}
