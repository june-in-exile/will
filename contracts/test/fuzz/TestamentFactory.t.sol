// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/TestamentFactory.sol";
import "src/Testament.sol";
import "mock/MockContracts.sol";

contract TestamentFactoryFuzzTest is Test {
    TestamentFactory factory;
    MockGroth16Verifier mockTestatorVerifier;
    MockGroth16Verifier mockDecryptionVerifier;
    MockJSONCIDVerifier mockJSONCIDVerifier;

    address executor = makeAddr("executor");
    address permit2 = makeAddr("permit2");

    JSONCIDVerifier.JsonObject testamentJson;

    function setUp() public {
        mockTestatorVerifier = new MockGroth16Verifier();
        mockDecryptionVerifier = new MockGroth16Verifier();
        mockJSONCIDVerifier = new MockJSONCIDVerifier();

        factory = new TestamentFactory(
            address(mockTestatorVerifier),
            address(mockDecryptionVerifier),
            address(mockJSONCIDVerifier),
            executor,
            permit2
        );

        string[] memory keys = new string[](1);
        keys[0] = "salt";

        string[] memory values = new string[](1);
        values[0] = "12345";

        testamentJson = JSONCIDVerifier.JsonObject({
            keys: keys,
            values: values
        });
    }

    function test_PredictTestament_DeterministicOutput(
        address testator,
        uint256 salt,
        address token,
        uint256 amount,
        address beneficiary
    ) public view {
        vm.assume(testator != address(0));
        vm.assume(beneficiary != address(0));
        vm.assume(token != address(0));

        Testament.Estate[] memory estates = new Testament.Estate[](1);
        estates[0] = Testament.Estate({
            token: token,
            amount: amount,
            beneficiary: beneficiary
        });

        address predicted1 = factory.predictTestament(testator, estates, salt);
        address predicted2 = factory.predictTestament(testator, estates, salt);

        assertEq(predicted1, predicted2);
    }

    function test_PredictTestament_DifferentSalts(
        address testator,
        uint256 salt1,
        uint256 salt2,
        address token,
        uint256 amount,
        address beneficiary
    ) public view {
        vm.assume(testator != address(0));
        vm.assume(beneficiary != address(0));
        vm.assume(token != address(0));
        vm.assume(salt1 != salt2);

        Testament.Estate[] memory estates = new Testament.Estate[](1);
        estates[0] = Testament.Estate({
            token: token,
            amount: amount,
            beneficiary: beneficiary
        });

        address predicted1 = factory.predictTestament(testator, estates, salt1);
        address predicted2 = factory.predictTestament(testator, estates, salt2);

        assertTrue(predicted1 != predicted2);
    }

    function test_NotarizeCID_RevertOnInvalidSignature(
        string calldata cid,
        bytes calldata invalidSignature
    ) public {
        vm.assume(bytes(cid).length > 0);
        vm.assume(invalidSignature.length > 0);

        mockJSONCIDVerifier.setShouldReturnTrue(true);
        mockTestatorVerifier.setShouldReturnTrue(true);

        uint256[2] memory pA = [uint256(1), uint256(2)];
        uint256[2][2] memory pB = [
            [uint256(3), uint256(4)],
            [uint256(5), uint256(6)]
        ];
        uint256[2] memory pC = [uint256(7), uint256(8)];
        uint256[1] memory pubSignals = [uint256(9)];

        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

        vm.expectRevert(TestamentFactory.ExecutorSignatureInvalid.selector);
        factory.notarizeCID(cid, invalidSignature);
    }

    function test_OnlyAuthorizedModifier(
        address unauthorizedCaller,
        string calldata cid
    ) public {
        vm.assume(unauthorizedCaller != executor);
        vm.assume(bytes(cid).length > 0);

        vm.prank(unauthorizedCaller);
        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.UnauthorizedCaller.selector,
                unauthorizedCaller,
                executor
            )
        );
        factory.testatorValidateTimes(cid);

        vm.prank(executor);
        factory.testatorValidateTimes(cid); // Should not revert
    }
}
