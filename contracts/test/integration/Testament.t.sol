// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "src/Testament.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IPermit2, ISignatureTransfer} from "permit2/src/interfaces/IPermit2.sol";

// Mock ERC20 token for testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock Permit2 contract for testing
contract MockPermit2 {
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    function permitTransferFrom(
        ISignatureTransfer.PermitBatchTransferFrom memory permit,
        ISignatureTransfer.SignatureTransferDetails[] calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external {
        // Mark nonce as used
        usedNonces[owner][permit.nonce] = true;

        // Simulate the transfer
        for (uint256 i = 0; i < permit.permitted.length; i++) {
            IERC20(permit.permitted[i].token).transferFrom(
                owner,
                transferDetails[i].to,
                transferDetails[i].requestedAmount
            );
        }
    }

    function permitTransferFrom(
        ISignatureTransfer.PermitTransferFrom memory permit,
        ISignatureTransfer.SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external {
        // Implementation for single transfer
        usedNonces[owner][permit.nonce] = true;
        IERC20(permit.permitted.token).transferFrom(
            owner,
            transferDetails.to,
            transferDetails.requestedAmount
        );
    }
}

contract TestamentTest is Test {
    Testament public testament;
    MockERC20 public token1;
    MockERC20 public token2;
    MockPermit2 public mockPermit2;

    // Real Permit2 address for fork testing
    address public constant REAL_PERMIT2 =
        0x000000000022D473030F116dDEE9F6B43aC78BA3;

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

        // Deploy mock Permit2
        mockPermit2 = new MockPermit2();

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
        testament = new Testament(
            address(mockPermit2),
            testator,
            executor,
            estates
        );

        // Mint tokens to testator
        token1.mint(testator, 10000e18);
        token2.mint(testator, 5000e18);

        // Approve tokens for mock Permit2
        vm.startPrank(testator);
        token1.approve(address(mockPermit2), type(uint256).max);
        token2.approve(address(mockPermit2), type(uint256).max);
        vm.stopPrank();
    }

    // 整合測試 - 使用 Mock Permit2
    function testSignatureTransferWithMockPermit2() public {
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1000;
        bytes memory signature = "mock_signature";

        uint256 beneficiary1BalanceBefore = token1.balanceOf(beneficiary1);
        uint256 beneficiary2BalanceBefore = token2.balanceOf(beneficiary2);

        vm.expectEmit(true, true, true, true);
        emit TestamentExecuted();

        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(nonce, deadline, signature);

        assertEq(
            token1.balanceOf(beneficiary1),
            beneficiary1BalanceBefore + 1000e18
        );
        assertEq(
            token2.balanceOf(beneficiary2),
            beneficiary2BalanceBefore + 500e18
        );
        assertTrue(testament.executed());
    }

    // Fork 測試 - 使用真實的 Permit2
    function testForkWithRealPermit2() public {
        // Fork mainnet
        vm.createFork("https://ethereum.publicnode.com");

        // Deploy new testament with real Permit2
        Testament.Estate[] memory newEstates = new Testament.Estate[](1);
        newEstates[0] = Testament.Estate({
            beneficiary: beneficiary1,
            token: address(token1),
            amount: 1000e18
        });

        Testament realTestament = new Testament(
            REAL_PERMIT2,
            testator,
            executor,
            newEstates
        );

        // Mint tokens
        token1.mint(testator, 10000e18);

        // Approve real Permit2
        vm.prank(testator);
        token1.approve(REAL_PERMIT2, type(uint256).max);

        // Test basic functionality (without actual signature execution)
        assertEq(address(realTestament.permit2()), REAL_PERMIT2);
        assertEq(realTestament.testator(), testator);
        assertEq(realTestament.executor(), executor);
    }

    function testSignatureTransferFailsWhenAlreadyExecuted() public {
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1000;
        bytes memory signature = "mock_signature";

        // First execution (successful)
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(nonce, deadline, signature);

        // Second execution should fail
        vm.expectRevert(Testament.AlreadyExecuted.selector);
        vm.prank(executor);
        testament.signatureTransferToBeneficiaries(2, deadline, "signature2");
    }
}
