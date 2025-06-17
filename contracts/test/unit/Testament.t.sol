// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "src/Testament.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TestamentUnitTest is Test {
    Testament public testament;
    MockERC20 public token1;
    MockERC20 public token2;

    address public PERMIT2 =
        address(0x000000000022D473030F116dDEE9F6B43aC78BA3);

    address public testator = address(0x1);
    address public executor = address(0x2);
    address public beneficiary1 = address(0x3);
    address public beneficiary2 = address(0x4);

    Testament.Estate[] public estates;

    event TestamentExecuted();

    function setUp() public {
        // Deploy mock tokens
        token1 = new MockERC20("Token1", "TK1");
        token2 = new MockERC20("Token2", "TK2");

        // Setup estates
        estates.push(
            Testament.Estate({
                beneficiary: beneficiary1,
                token: address(token1),
                amount: 1000e18
            })
        );
        estates.push(
            Testament.Estate({
                beneficiary: beneficiary2,
                token: address(token2),
                amount: 500e18
            })
        );

        // Deploy testament with mock Permit2
        testament = new Testament(PERMIT2, testator, executor, estates);

        // Mint tokens to testator
        token1.mint(testator, 10000e18);
        token2.mint(testator, 5000e18);
    }

    // Constructor Tests
    function testConstructorSuccess() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 100e18
        });

        Testament newTestament = new Testament(
            PERMIT2,
            testator,
            executor,
            newEstates
        );

        assertEq(newTestament.testator(), testator);
        assertEq(newTestament.executor(), executor);
        assertEq(address(newTestament.permit2()), PERMIT2);

        Testament.Estate[] memory retrievedEstates = newTestament
            .getAllEstates();
        assertEq(retrievedEstates.length, 1);
        assertEq(retrievedEstates[0].beneficiary, beneficiary1);
        assertEq(retrievedEstates[0].token, address(token1));
        assertEq(retrievedEstates[0].amount, 100e18);
    }

    function testConstructorFailsWithZeroPermit2Address() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 100e18
        });

        vm.expectRevert(Testament.Permit2AddressZero.selector);
        new Testament(address(0), testator, executor, newEstates);
    }

    function testConstructorFailsWithZeroTestatorAddress() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 100e18
        });

        vm.expectRevert(Testament.TestatorAddressZero.selector);
        new Testament(PERMIT2, address(0), executor, newEstates);
    }

    function testConstructorFailsWithZeroExecutorAddress() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 100e18
        });

        vm.expectRevert(Testament.ExecutorAddressZero.selector);
        new Testament(PERMIT2, testator, address(0), newEstates);
    }

    function testConstructorFailsWithZeroBeneficiaryAddress() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: address(0),
            token: address(token1),
            amount: 100e18
        });

        vm.expectRevert(Testament.BeneficiaryAddressZero.selector);
        new Testament(PERMIT2, testator, executor, newEstates);
    }

    function testConstructorFailsWithBeneficiaryAsTestator() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: testator,
            token: address(token1),
            amount: 100e18
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                Testament.BeneficiaryCannotBeTestator.selector,
                testator
            )
        );
        new Testament(PERMIT2, testator, executor, newEstates);
    }

    function testConstructorFailsWithZeroTokenAddress() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(0),
            amount: 100e18
        });

        vm.expectRevert(Testament.InvalidTokenAddress.selector);
        new Testament(PERMIT2, testator, executor, newEstates);
    }

    function testConstructorFailsWithZeroAmount() public {
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 0
        });

        vm.expectRevert(Testament.AmountMustBeGreaterThanZero.selector);
        new Testament(PERMIT2, testator, executor, newEstates);
    }

    // View Functions Tests
    function testGetAllEstates() public view {
        Testament.Estate[] memory retrievedEstates = testament.getAllEstates();

        assertEq(retrievedEstates.length, 2);

        assertEq(retrievedEstates[0].beneficiary, beneficiary1);
        assertEq(retrievedEstates[0].token, address(token1));
        assertEq(retrievedEstates[0].amount, 1000e18);

        assertEq(retrievedEstates[1].beneficiary, beneficiary2);
        assertEq(retrievedEstates[1].token, address(token2));
        assertEq(retrievedEstates[1].amount, 500e18);
    }

    function testEstatesPublicGetter() public view {
        (address beneficiary, address token, uint256 amount) = testament
            .estates(0);

        assertEq(beneficiary, beneficiary1);
        assertEq(token, address(token1));
        assertEq(amount, 1000e18);
    }

    // Transfer Failure Tests
    function testSignatureTransferFailsWithZeroNonce() public {
        vm.expectRevert(Testament.InvalidNonce.selector);
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(
            0,
            block.timestamp + 1000,
            ""
        );
    }

    function testSignatureTransferFailsWithExpiredDeadline() public {
        vm.expectRevert(Testament.DeadlineExpired.selector);
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(1, block.timestamp - 1, "");
    }

    function testSignatureTransferFailsWithInsufficientBalance() public {
        // Create a testament with amount greater than balance
        Testament.Estate[] memory largeEstates = new Testament.Estate[](1);
        largeEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 20000e18 // More than the 10000e18 minted
        });

        Testament largeTestament = new Testament(
            PERMIT2,
            testator,
            executor,
            largeEstates
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                Testament.InsufficientBalance.selector,
                address(token1),
                20000e18,
                10000e18
            )
        );
        vm.prank(executor);
        largeTestament.signatureTransferToBeneficiaries(
            1,
            block.timestamp + 1000,
            ""
        );
    }

    // Edge Cases
    function testEmptyEstatesArray() public {
        Testament.Estate[] memory emptyEstates = new Testament.Estate[](0);
        Testament emptyTestament = new Testament(
            PERMIT2,
            testator,
            executor,
            emptyEstates
        );

        assertEq(emptyTestament.getAllEstates().length, 0);
    }

    function testMultipleEstatesSameBeneficiary() public {
        Testament.Estate[] memory sameEstates = new Testament.Estate[](2);
        sameEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 100e18
        });
        sameEstates[1] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token2),
            amount: 200e18
        });

        Testament sameTestament = new Testament(
            PERMIT2,
            testator,
            executor,
            sameEstates
        );
        Testament.Estate[] memory retrieved = sameTestament.getAllEstates();

        assertEq(retrieved.length, 2);
        assertEq(retrieved[0].beneficiary, beneficiary1);
        assertEq(retrieved[1].beneficiary, beneficiary1);
    }

    function testMultipleEstatesSameToken() public {
        Testament.Estate[] memory sameTokenEstates = new Testament.Estate[](2);
        sameTokenEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 100e18
        });
        sameTokenEstates[1] = Testament.Estate({
            beneficiary: beneficiary2,
            token: address(token1),
            amount: 200e18
        });

        Testament sameTokenTestament = new Testament(
            PERMIT2,
            testator,
            executor,
            sameTokenEstates
        );
        Testament.Estate[] memory retrieved = sameTokenTestament
            .getAllEstates();

        assertEq(retrieved.length, 2);
        assertEq(retrieved[0].token, address(token1));
        assertEq(retrieved[1].token, address(token1));
    }
}
