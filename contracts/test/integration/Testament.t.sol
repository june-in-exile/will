// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "src/Testament.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPermit2, ISignatureTransfer} from "permit2/src/interfaces/IPermit2.sol";

contract TestamentIntegrationTest is Test {
    Testament public testament;

    address public constant PERMIT2 =
        address(0x000000000022D473030F116dDEE9F6B43aC78BA3);
    address public constant TESTATOR =
        address(0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc);
    address public constant EXECUTOR =
        address(0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a);

    address public constant BENEFICIARY0 =
        address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
    address public constant TOKEN0 =
        address(0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d); // USDC
    uint public constant AMOUNT0 = 1000; // USDC has 6 decimals

    address public constant BENEFICIARY1 =
        address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
    address public constant TOKEN1 =
        address(0xb1D4538B4571d411F07960EF2838Ce337FE1E80E); // LINK
    uint public constant AMOUNT1 = 5000000; // LINK has 18 decimals

    uint56 public constant NONCE = 640395789920456;
    uint56 public constant DEADLINE = 1781609900;
    bytes public constant PERMIT2_SIGNATURE =
        hex"443f3a5846dbfed52b46479e7ea2ae9e5bf4471c2e220a8416b2e60d3d09d3bf66b4fc1597f0440ea31b6967ba82131eb2f4d8e71742fafa2bf2f2fc225387f41b";

    Testament.Estate[] public estates;

    event TestamentExecuted();

    function setUp() public {
        uint256 forkId = vm.createFork(
            "https://sepolia-rollup.arbitrum.io/rpc"
        );
        vm.selectFork(forkId);

        require(block.chainid == 421614, "Must be on Arbitrum Sepolia");

        _verifyTokensExist();

        estates.push(
            Testament.Estate({
                beneficiary: BENEFICIARY0,
                token: address(TOKEN0),
                amount: AMOUNT0
            })
        );
        estates.push(
            Testament.Estate({
                beneficiary: BENEFICIARY1,
                token: address(TOKEN1),
                amount: AMOUNT1
            })
        );

        testament = new Testament(PERMIT2, TESTATOR, EXECUTOR, estates);

        vm.startPrank(TESTATOR);
        IERC20(TOKEN0).approve(PERMIT2, type(uint256).max);
        IERC20(TOKEN1).approve(PERMIT2, type(uint256).max);
        vm.stopPrank();
    }

    function _verifyTokensExist() internal view {
        require(TOKEN0.code.length > 0, "USDC contract not found");
        require(TOKEN1.code.length > 0, "LINK contract not found");
        require(PERMIT2.code.length > 0, "Permit2 contract not found");
    }

    function testSignatureTransferWithArbitrumSepolia() public {
        uint56 nonce = 640395789920456;
        uint56 deadline = 1781609900;
        bytes
            memory permit2_signature = hex"443f3a5846dbfed52b46479e7ea2ae9e5bf4471c2e220a8416b2e60d3d09d3bf66b4fc1597f0440ea31b6967ba82131eb2f4d8e71742fafa2bf2f2fc225387f41b";

        uint256 testatorUSDCBefore = IERC20(TOKEN0).balanceOf(TESTATOR);
        uint256 testatorLINKBefore = IERC20(TOKEN1).balanceOf(TESTATOR);
        uint256 beneficiary0USDCBefore = IERC20(TOKEN0).balanceOf(BENEFICIARY0);
        uint256 beneficiary1LINKBefore = IERC20(TOKEN1).balanceOf(BENEFICIARY1);

        console.log("Before execution:");
        console.log("Testator USDC:", testatorUSDCBefore);
        console.log("Testator LINK:", testatorLINKBefore);
        console.log("Beneficiary0 USDC:", beneficiary0USDCBefore);
        console.log("Beneficiary1 LINK:", beneficiary1LINKBefore);

        assertFalse(testament.executed());

        vm.expectEmit(true, true, true, true);
        emit TestamentExecuted();

        vm.prank(EXECUTOR);
        testament.signatureTransferToBeneficiaries(
            nonce,
            deadline,
            permit2_signature
        );

        assertEq(IERC20(TOKEN0).balanceOf(TESTATOR), testatorUSDCBefore - 1000);
        assertEq(
            IERC20(TOKEN1).balanceOf(TESTATOR),
            testatorLINKBefore - 5000000
        );
        assertEq(
            IERC20(TOKEN0).balanceOf(BENEFICIARY0),
            beneficiary0USDCBefore + 1000
        );
        assertEq(
            IERC20(TOKEN1).balanceOf(BENEFICIARY1),
            beneficiary1LINKBefore + 5000000
        );
        assertTrue(testament.executed());
    }

    function testSignatureTransferFailsWhenAlreadyExecuted() public {
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1000;
        bytes memory signature = "mock_signature";

        // First execution (successful)
        vm.prank(EXECUTOR);
        testament.signatureTransferToBeneficiaries(nonce, deadline, signature);

        // Second execution should fail
        vm.expectRevert(Testament.AlreadyExecuted.selector);
        vm.prank(EXECUTOR);
        testament.signatureTransferToBeneficiaries(nonce, deadline, signature);
    }
}
