// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// import "forge-std/Test.sol";
// import "../../src/Testament.sol";
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import {IPermit2, ISignatureTransfer} from "permit2/src/interfaces/IPermit2.sol";

// // Mock ERC20 token for testing
// contract MockERC20 is ERC20 {
//     constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

//     function mint(address to, uint256 amount) external {
//         _mint(to, amount);
//     }
// }

// // Mock Permit2 contract for testing
// contract MockPermit2 {
//     mapping(address => mapping(uint256 => bool)) public usedNonces;

//     function permitTransferFrom(
//         ISignatureTransfer.PermitBatchTransferFrom memory permit,
//         ISignatureTransfer.SignatureTransferDetails[] calldata transferDetails,
//         address owner,
//         bytes calldata signature
//     ) external {
//         // Mark nonce as used
//         usedNonces[owner][permit.nonce] = true;

//         // Simulate the transfer
//         for (uint256 i = 0; i < permit.permitted.length; i++) {
//             IERC20(permit.permitted[i].token).transferFrom(
//                 owner,
//                 transferDetails[i].to,
//                 transferDetails[i].requestedAmount
//             );
//         }
//     }

//     function permitTransferFrom(
//         ISignatureTransfer.PermitTransferFrom memory permit,
//         ISignatureTransfer.SignatureTransferDetails calldata transferDetails,
//         address owner,
//         bytes calldata signature
//     ) external {
//         // Implementation for single transfer
//         usedNonces[owner][permit.nonce] = true;
//         IERC20(permit.permitted.token).transferFrom(
//             owner,
//             transferDetails.to,
//             transferDetails.requestedAmount
//         );
//     }
// }

// contract TestamentTest is Test {
//     Testament public testament;
//     MockERC20 public token1;
//     MockERC20 public token2;
//     MockPermit2 public mockPermit2;

//     // Real Permit2 address for fork testing
//     address public constant REAL_PERMIT2 =
//         0x000000000022D473030F116dDEE9F6B43aC78BA3;

//     address public testator = address(0x1);
//     address public executor = address(0x2);
//     address public beneficiary1 = address(0x3);
//     address public beneficiary2 = address(0x4);

//     Testament.Estate[] public estates;

//     event TestamentExecuted();

//     function setUp() public {
//         // Deploy mock tokens
//         token1 = new MockERC20("Token1", "TK1");
//         token2 = new MockERC20("Token2", "TK2");

//         // Deploy mock Permit2
//         mockPermit2 = new MockPermit2();

//         // Setup estates
//         estates.push(
//             Testament.Estate({
//                 beneficiary: beneficiary1,
//                 token: address(token1),
//                 amount: 1000e18
//             })
//         );
//         estates.push(
//             Testament.Estate({
//                 beneficiary: beneficiary2,
//                 token: address(token2),
//                 amount: 500e18
//             })
//         );

//         // Deploy testament with mock Permit2
//         testament = new Testament(
//             address(mockPermit2),
//             testator,
//             executor,
//             estates
//         );

//         // Mint tokens to testator
//         token1.mint(testator, 10000e18);
//         token2.mint(testator, 5000e18);

//         // Approve tokens for mock Permit2
//         vm.startPrank(testator);
//         token1.approve(address(mockPermit2), type(uint256).max);
//         token2.approve(address(mockPermit2), type(uint256).max);
//         vm.stopPrank();
//     }

//     // Constructor Tests
//     function testConstructorSuccess() public {
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 100e18
//         });

//         Testament newTestament = new Testament(
//             address(mockPermit2),
//             testator,
//             executor,
//             newEstates
//         );

//         assertEq(newTestament.testator(), testator);
//         assertEq(newTestament.executor(), executor);
//         assertEq(address(newTestament.permit2()), address(mockPermit2));

//         Testament.Estate[] memory retrievedEstates = newTestament
//             .getAllEstates();
//         assertEq(retrievedEstates.length, 1);
//         assertEq(retrievedEstates[0].beneficiary, beneficiary1);
//         assertEq(retrievedEstates[0].token, address(token1));
//         assertEq(retrievedEstates[0].amount, 100e18);
//     }

//     function testConstructorFailsWithZeroPermit2Address() public {
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 100e18
//         });

//         vm.expectRevert(Testament.Permit2AddressZero.selector);
//         new Testament(address(0), testator, executor, newEstates);
//     }

//     function testConstructorFailsWithZeroTestatorAddress() public {
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 100e18
//         });

//         vm.expectRevert(Testament.TestatorAddressZero.selector);
//         new Testament(address(mockPermit2), address(0), executor, newEstates);
//     }

//     function testConstructorFailsWithZeroExecutorAddress() public {
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 100e18
//         });

//         vm.expectRevert(Testament.ExecutorAddressZero.selector);
//         new Testament(address(mockPermit2), testator, address(0), newEstates);
//     }

//     function testConstructorFailsWithZeroBeneficiaryAddress() public {
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: address(0),
//             token: address(token1),
//             amount: 100e18
//         });

//         vm.expectRevert(Testament.BeneficiaryAddressZero.selector);
//         new Testament(address(mockPermit2), testator, executor, newEstates);
//     }

//     function testConstructorFailsWithBeneficiaryAsTestator() public {
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: testator,
//             token: address(token1),
//             amount: 100e18
//         });

//         vm.expectRevert(
//             abi.encodeWithSelector(
//                 Testament.BeneficiaryCannotBeTestator.selector,
//                 testator
//             )
//         );
//         new Testament(address(mockPermit2), testator, executor, newEstates);
//     }

//     function testConstructorFailsWithZeroTokenAddress() public {
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(0),
//             amount: 100e18
//         });

//         vm.expectRevert(Testament.InvalidTokenAddress.selector);
//         new Testament(address(mockPermit2), testator, executor, newEstates);
//     }

//     function testConstructorFailsWithZeroAmount() public {
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 0
//         });

//         vm.expectRevert(Testament.AmountMustBeGreaterThanZero.selector);
//         new Testament(address(mockPermit2), testator, executor, newEstates);
//     }

//     // View Functions Tests
//     function testGetAllEstates() public {
//         Testament.Estate[] memory retrievedEstates = testament.getAllEstates();

//         assertEq(retrievedEstates.length, 2);

//         assertEq(retrievedEstates[0].beneficiary, beneficiary1);
//         assertEq(retrievedEstates[0].token, address(token1));
//         assertEq(retrievedEstates[0].amount, 1000e18);

//         assertEq(retrievedEstates[1].beneficiary, beneficiary2);
//         assertEq(retrievedEstates[1].token, address(token2));
//         assertEq(retrievedEstates[1].amount, 500e18);
//     }

//     function testEstatesPublicGetter() public {
//         (address beneficiary, address token, uint256 amount) = testament
//             .estates(0);

//         assertEq(beneficiary, beneficiary1);
//         assertEq(token, address(token1));
//         assertEq(amount, 1000e18);
//     }

//     function testSignatureTransferFailsWithNonExecutor() public {
//         vm.expectRevert(Testament.OnlyExecutor.selector);
//         vm.prank(address(0x999));
//         testament.signatureTransferToBeneficiaries(
//             1,
//             block.timestamp + 1000,
//             ""
//         );
//     }

//     function testSignatureTransferFailsWithZeroNonce() public {
//         vm.expectRevert(Testament.InvalidNonce.selector);
//         vm.prank(executor);
//         testament.signatureTransferToBeneficiaries(
//             0,
//             block.timestamp + 1000,
//             ""
//         );
//     }

//     function testSignatureTransferFailsWithExpiredDeadline() public {
//         vm.expectRevert(Testament.DeadlineExpired.selector);
//         vm.prank(executor);
//         testament.signatureTransferToBeneficiaries(1, block.timestamp - 1, "");
//     }

//     function testSignatureTransferFailsWithInsufficientBalance() public {
//         // Create a testament with amount greater than balance
//         Testament.Estate[] memory largeEstates = new Testament.Estate[](1);
//         largeEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 20000e18 // More than the 10000e18 minted
//         });

//         Testament largeTestament = new Testament(
//             address(mockPermit2),
//             testator,
//             executor,
//             largeEstates
//         );

//         vm.expectRevert(
//             abi.encodeWithSelector(
//                 Testament.InsufficientBalance.selector,
//                 address(token1),
//                 20000e18,
//                 10000e18
//             )
//         );
//         vm.prank(executor);
//         largeTestament.signatureTransferToBeneficiaries(
//             1,
//             block.timestamp + 1000,
//             ""
//         );
//     }

//     // 整合測試 - 使用 Mock Permit2
//     function testSignatureTransferWithMockPermit2() public {
//         uint256 nonce = 1;
//         uint256 deadline = block.timestamp + 1000;
//         bytes memory signature = "mock_signature";

//         uint256 beneficiary1BalanceBefore = token1.balanceOf(beneficiary1);
//         uint256 beneficiary2BalanceBefore = token2.balanceOf(beneficiary2);

//         vm.expectEmit(true, true, true, true);
//         emit TestamentExecuted();

//         vm.prank(executor);
//         testament.signatureTransferToBeneficiaries(nonce, deadline, signature);

//         assertEq(
//             token1.balanceOf(beneficiary1),
//             beneficiary1BalanceBefore + 1000e18
//         );
//         assertEq(
//             token2.balanceOf(beneficiary2),
//             beneficiary2BalanceBefore + 500e18
//         );
//         assertTrue(testament.executed());
//     }

//     // Fork 測試 - 使用真實的 Permit2
//     function testForkWithRealPermit2() public {
//         // Fork mainnet
//         vm.createFork("https://ethereum.publicnode.com");

//         // Deploy new testament with real Permit2
//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 1000e18
//         });

//         Testament realTestament = new Testament(
//             REAL_PERMIT2,
//             testator,
//             executor,
//             newEstates
//         );

//         // Mint tokens
//         token1.mint(testator, 10000e18);

//         // Approve real Permit2
//         vm.prank(testator);
//         token1.approve(REAL_PERMIT2, type(uint256).max);

//         // Test basic functionality (without actual signature execution)
//         assertEq(address(realTestament.permit2()), REAL_PERMIT2);
//         assertEq(realTestament.testator(), testator);
//         assertEq(realTestament.executor(), executor);
//     }

//     function testSignatureTransferFailsWhenAlreadyExecuted() public {
//         uint256 nonce = 1;
//         uint256 deadline = block.timestamp + 1000;
//         bytes memory signature = "mock_signature";

//         // First execution (successful)
//         vm.prank(executor);
//         testament.signatureTransferToBeneficiaries(nonce, deadline, signature);

//         // Second execution should fail
//         vm.expectRevert(Testament.AlreadyExecuted.selector);
//         vm.prank(executor);
//         testament.signatureTransferToBeneficiaries(2, deadline, "signature2");
//     }

//     // Fuzz Tests
//     function testFuzzConstructorValidEstates(
//         address _permit2,
//         address _testator,
//         address _executor,
//         address _beneficiary,
//         address _token,
//         uint256 _amount
//     ) public {
//         vm.assume(_permit2 != address(0));
//         vm.assume(_testator != address(0));
//         vm.assume(_executor != address(0));
//         vm.assume(_beneficiary != address(0));
//         vm.assume(_beneficiary != _testator);
//         vm.assume(_token != address(0));
//         vm.assume(_amount > 0);

//         Testament.Estate[] memory newEstates = new Testament.Estate[](1);
//         newEstates[0] = Testament.Estate({
//             beneficiary: _beneficiary,
//             token: _token,
//             amount: _amount
//         });

//         Testament newTestament = new Testament(
//             _permit2,
//             _testator,
//             _executor,
//             newEstates
//         );

//         assertEq(address(newTestament.permit2()), _permit2);
//         assertEq(newTestament.testator(), _testator);
//         assertEq(newTestament.executor(), _executor);
//         assertEq(newTestament.getAllEstates().length, 1);
//     }

//     function testFuzzSignatureTransferAccessControl(
//         address caller,
//         uint256 nonce,
//         uint256 deadline
//     ) public {
//         vm.assume(caller != executor);
//         vm.assume(nonce != 0);
//         vm.assume(deadline > block.timestamp);

//         vm.expectRevert(Testament.OnlyExecutor.selector);
//         vm.prank(caller);
//         testament.signatureTransferToBeneficiaries(nonce, deadline, "");
//     }

//     // Edge Cases
//     function testEmptyEstatesArray() public {
//         Testament.Estate[] memory emptyEstates = new Testament.Estate[](0);
//         Testament emptyTestament = new Testament(
//             address(mockPermit2),
//             testator,
//             executor,
//             emptyEstates
//         );

//         assertEq(emptyTestament.getAllEstates().length, 0);
//     }

//     function testMultipleEstatesSameBeneficiary() public {
//         Testament.Estate[] memory sameEstates = new Testament.Estate[](2);
//         sameEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 100e18
//         });
//         sameEstates[1] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token2),
//             amount: 200e18
//         });

//         Testament sameTestament = new Testament(
//             address(mockPermit2),
//             testator,
//             executor,
//             sameEstates
//         );
//         Testament.Estate[] memory retrieved = sameTestament.getAllEstates();

//         assertEq(retrieved.length, 2);
//         assertEq(retrieved[0].beneficiary, beneficiary1);
//         assertEq(retrieved[1].beneficiary, beneficiary1);
//     }

//     function testMultipleEstatesSameToken() public {
//         Testament.Estate[] memory sameTokenEstates = new Testament.Estate[](2);
//         sameTokenEstates[0] = Testament.Estate({
//             beneficiary: beneficiary1,
//             token: address(token1),
//             amount: 100e18
//         });
//         sameTokenEstates[1] = Testament.Estate({
//             beneficiary: beneficiary2,
//             token: address(token1),
//             amount: 200e18
//         });

//         Testament sameTokenTestament = new Testament(
//             address(mockPermit2),
//             testator,
//             executor,
//             sameTokenEstates
//         );
//         Testament.Estate[] memory retrieved = sameTokenTestament
//             .getAllEstates();

//         assertEq(retrieved.length, 2);
//         assertEq(retrieved[0].token, address(token1));
//         assertEq(retrieved[1].token, address(token1));
//     }

//     // Gas Tests
//     function testGasUsageConstructor() public {
//         Testament.Estate[] memory gasEstates = new Testament.Estate[](10);
//         for (uint256 i = 0; i < 10; i++) {
//             gasEstates[i] = Testament.Estate({
//                 beneficiary: address(uint160(i + 100)),
//                 token: address(token1),
//                 amount: 100e18
//             });
//         }

//         uint256 gasBefore = gasleft();
//         Testament gasTestament = new Testament(
//             address(mockPermit2),
//             testator,
//             executor,
//             gasEstates
//         );
//         uint256 gasUsed = gasBefore - gasleft();

//         console.log("Gas used for constructor with 10 estates:", gasUsed);
//         assertTrue(gasUsed > 0);
//         assertEq(gasTestament.getAllEstates().length, 10);
//     }
// }
