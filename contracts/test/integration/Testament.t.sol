// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// import "forge-std/Test.sol";
// import "src/Testament.sol";
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// contract TestamentIntegrationTest is Test {
//     Testament testament;

//     address public constant PERMIT2 =
//         address(0x000000000022D473030F116dDEE9F6B43aC78BA3);
//     address public constant TESTAMENT_FACTORY_ADDRESS =
//         address(0x148b32ABF9E57B8C6585E7EFdB5113f542f3fB4d);
//     address public constant EXECUTOR =
//         address(0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a);
//     address public constant TESTATOR =
//         address(0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc);

//     address public constant BENEFICIARY0 =
//         address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
//     address public constant TOKEN0 =
//         address(0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d); // USDC
//     uint256 public constant AMOUNT0 = 1000; // USDC has 6 decimals

//     address public constant BENEFICIARY1 =
//         address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
//     address public constant TOKEN1 =
//         address(0xb1D4538B4571d411F07960EF2838Ce337FE1E80E); // LINK
//     uint256 public constant AMOUNT1 = 5000000; // LINK has 18 decimals

//     uint256 public constant SALT = 8907834245420950;

//     uint56 public constant NONCE = 728274708989418;
//     uint56 public constant DEADLINE = 1781624880;
//     bytes public constant PERMIT2_SIGNATURE =
//         hex"413847130638acc76d524936e70560b518df878e6a0a51ec6b83a3f085a9ccc430910f0ef74115c3c12d760edcb8c515140b4e97fef57fc49eb2569fdbbd88891b";

//     address public constant TESTAMENT_ADDRESS =
//         address(0x027fF49Aa250EF8DC217e6Da5176D8d1e5B022e8);

//     Testament.Estate[] public estates;

//     event TestamentExecuted();

//     function setUp() public {
//         uint256 forkId = vm.createFork(
//             "https://sepolia-rollup.arbitrum.io/rpc"
//         );
//         vm.selectFork(forkId);

//         require(block.chainid == 421614, "Must be on Arbitrum Sepolia");

//         estates.push(
//             Testament.Estate({
//                 beneficiary: BENEFICIARY0,
//                 token: TOKEN0,
//                 amount: AMOUNT0
//             })
//         );
//         estates.push(
//             Testament.Estate({
//                 beneficiary: BENEFICIARY1,
//                 token: TOKEN1,
//                 amount: AMOUNT1
//             })
//         );

//         testament = new Testament{salt: bytes32(SALT)}(
//             PERMIT2,
//             TESTATOR,
//             EXECUTOR,
//             estates
//         );
//         vm.etch(TESTAMENT_ADDRESS, address(testament).code);
//         testament = Testament(TESTAMENT_ADDRESS);

//         vm.startPrank(TESTATOR);
//         ERC20(TOKEN0).approve(PERMIT2, type(uint256).max);
//         ERC20(TOKEN1).approve(PERMIT2, type(uint256).max);
//         vm.stopPrank();
//     }

//     function testSignatureTransferToBeneficiaries() public {
//         uint256 testatorUSDCBefore = ERC20(TOKEN0).balanceOf(TESTATOR);
//         uint256 testatorLINKBefore = ERC20(TOKEN1).balanceOf(TESTATOR);
//         uint256 beneficiary0USDCBefore = ERC20(TOKEN0).balanceOf(BENEFICIARY0);
//         uint256 beneficiary1LINKBefore = ERC20(TOKEN1).balanceOf(BENEFICIARY1);

//         console.log("Before execution:");
//         console.log("Testator USDC:", testatorUSDCBefore);
//         console.log("Testator LINK:", testatorLINKBefore);
//         console.log("Beneficiary0 USDC:", beneficiary0USDCBefore);
//         console.log("Beneficiary1 LINK:", beneficiary1LINKBefore);

//         assertFalse(testament.executed());

//         vm.expectEmit(true, true, true, true);
//         emit TestamentExecuted();

//         vm.prank(EXECUTOR);
//         testament.signatureTransferToBeneficiaries(
//             NONCE,
//             DEADLINE,
//             PERMIT2_SIGNATURE
//         );

//         assertEq(
//             IERC20(TOKEN0).balanceOf(TESTATOR),
//             testatorUSDCBefore - AMOUNT0
//         );
//         assertEq(
//             IERC20(TOKEN1).balanceOf(TESTATOR),
//             testatorLINKBefore - AMOUNT1
//         );
//         assertEq(
//             IERC20(TOKEN0).balanceOf(BENEFICIARY0),
//             beneficiary0USDCBefore + AMOUNT0
//         );
//         assertEq(
//             IERC20(TOKEN1).balanceOf(BENEFICIARY1),
//             beneficiary1LINKBefore + AMOUNT1
//         );
//         assertTrue(testament.executed());
//     }
// }
