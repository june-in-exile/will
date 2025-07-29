// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "mock/MockContracts.sol";

contract WillFactoryFuzzTest is Test {
    WillFactory factory;
    MockGroth16Verifier mockuploadCidVerifier;
    MockGroth16Verifier mockDecryptionVerifier;
    MockJsonCidVerifier mockJsonCidVerifier;

    address executor = makeAddr("executor");
    address permit2 = makeAddr("permit2");

    JsonCidVerifier.TypedJsonObject willJson;

    function setUp() public {
        mockuploadCidVerifier = new MockGroth16Verifier();
        mockDecryptionVerifier = new MockGroth16Verifier();
        mockJsonCidVerifier = new MockJsonCidVerifier();

        factory = new WillFactory(
            address(mockuploadCidVerifier),
            address(mockDecryptionVerifier),
            address(mockJsonCidVerifier),
            executor,
            permit2
        );

        string[] memory keys = new string[](1);
        keys[0] = "salt";

        JsonCidVerifier.JsonValue[] memory values = new JsonCidVerifier.JsonValue[](1);
        values[0] = JsonCidVerifier.JsonValue("12345", JsonCidVerifier.JsonValueType(1));

        willJson = JsonCidVerifier.TypedJsonObject({keys: keys, values: values});
    }

    function test_PredictWill_DeterministicOutput(
        address testator,
        uint256 salt,
        address token,
        uint256 amount,
        address beneficiary
    ) public view {
        vm.assume(testator != address(0));
        vm.assume(beneficiary != address(0));
        vm.assume(token != address(0));

        Will.Estate[] memory estates = new Will.Estate[](1);
        estates[0] = Will.Estate({
            token: token,
            amount: amount,
            beneficiary: beneficiary
        });

        address predicted1 = factory.predictWill(testator, estates, salt);
        address predicted2 = factory.predictWill(testator, estates, salt);

        assertEq(predicted1, predicted2);
    }

    function test_PredictWill_DifferentSalts(
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

        Will.Estate[] memory estates = new Will.Estate[](1);
        estates[0] = Will.Estate({
            token: token,
            amount: amount,
            beneficiary: beneficiary
        });

        address predicted1 = factory.predictWill(testator, estates, salt1);
        address predicted2 = factory.predictWill(testator, estates, salt2);

        assertTrue(predicted1 != predicted2);
    }

    function test_NotarizeCID_RevertOnInvalidSignature(
        string calldata cid,
        bytes calldata invalidSignature
    ) public {
        vm.assume(bytes(cid).length > 0);
        vm.assume(invalidSignature.length > 0);

        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCidVerifier.setShouldReturnTrue(true);

        uint256[2] memory pA = [uint256(1), uint256(2)];
        uint256[2][2] memory pB = [
            [uint256(3), uint256(4)],
            [uint256(5), uint256(6)]
        ];
        uint256[2] memory pC = [uint256(7), uint256(8)];
        uint256[1] memory pubSignals = [uint256(9)];

        factory.uploadCid(pA, pB, pC, pubSignals, willJson, cid);

        vm.expectRevert(WillFactory.ExecutorSignatureInvalid.selector);
        factory.notarizeCid(cid, invalidSignature);
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
                WillFactory.UnauthorizedCaller.selector,
                unauthorizedCaller,
                executor
            )
        );
        factory.testatorValidateTimes(cid);

        vm.prank(executor);
        factory.testatorValidateTimes(cid); // Should not revert
    }
}
