// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "mock/MockContracts.sol";

contract WillFactoryFuzzTest is Test {
    WillFactory factory;
    MockCidUploadVerifier mockCidUploadVerifier;
    MockWillCreationVerifier mockWillCreationVerifier;
    MockJsonCidVerifier mockJsonCidVerifier;

    address notary = makeAddr("notary");
    address executor = makeAddr("executor");
    address permit2 = makeAddr("permit2");

    JsonCidVerifier.TypedJsonObject willJson;

    function setUp() public {
        mockCidUploadVerifier = new MockCidUploadVerifier();
        mockWillCreationVerifier = new MockWillCreationVerifier();
        mockJsonCidVerifier = new MockJsonCidVerifier();

        factory = new WillFactory(
            address(mockCidUploadVerifier),
            address(mockWillCreationVerifier),
            address(mockJsonCidVerifier),
            notary,
            executor,
            permit2
        );

        string[] memory keys = new string[](1);
        keys[0] = "salt";

        JsonCidVerifier.JsonValue[] memory values = new JsonCidVerifier.JsonValue[](1);
        values[0] = JsonCidVerifier.JsonValue("12345", JsonCidVerifier.JsonValueType(1));

        willJson = JsonCidVerifier.TypedJsonObject({ keys: keys, values: values });
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
        estates[0] = Will.Estate({ token: token, amount: amount, beneficiary: beneficiary });

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
        estates[0] = Will.Estate({ token: token, amount: amount, beneficiary: beneficiary });

        address predicted1 = factory.predictWill(testator, estates, salt1);
        address predicted2 = factory.predictWill(testator, estates, salt2);

        assertTrue(predicted1 != predicted2);
    }

    function test_NotarizeCid_RevertOnInvalidSignature(string calldata cid, uint256 wrongPrivateKey) public {
        vm.assume(bytes(cid).length > 0);
        vm.assume(wrongPrivateKey > 0 && wrongPrivateKey < 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141);

        address wrongSigner = vm.addr(wrongPrivateKey);
        vm.assume(wrongSigner != notary);

        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockCidUploadVerifier.setShouldReturnTrue(true);

        uint256[2] memory pA = [uint256(1), uint256(2)];
        uint256[2][2] memory pB = [[uint256(3), uint256(4)], [uint256(5), uint256(6)]];
        uint256[2] memory pC = [uint256(7), uint256(8)];
        uint256[286] memory pubSignals;
        for (uint256 i = 0; i < 286; i++) {
            pubSignals[i] = i + 1;
        }

        address testator = address(uint160(pubSignals[0]));
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, pubSignals, willJson, cid);
        
        vm.warp(block.timestamp + 1);

        // Create a valid signature but from wrong signer
        bytes32 messageHash = keccak256(abi.encodePacked(cid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, ethSignedMessageHash);
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        // vm.expectRevert(WillFactory.SignatureInvalid.selector);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.SignatureInvalid.selector, cid, wrongSignature, notary));
        vm.prank(executor);
        factory.notarizeCid(cid, wrongSignature);
    }

    function test_OnlyAuthorizedModifier(address unauthorizedCaller, string calldata cid) public {
        vm.assume(unauthorizedCaller != executor);
        vm.assume(bytes(cid).length > 0);

        vm.prank(unauthorizedCaller);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.UnauthorizedCaller.selector, unauthorizedCaller, executor));
        factory.cidUploadedTimes(cid);

        vm.prank(executor);
        factory.cidUploadedTimes(cid); // Should not revert
    }
}
