// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "mock/MockContracts.sol";

contract WillFactoryUnitTest is Test {
    WillFactory factory;
    MockCidUploadVerifier mockcidUploadVerifier;
    MockWillCreationVerifier mockWillCreationVerifier;
    MockJsonCidVerifier mockJsonCidVerifier;

    address notary;
    uint256 notaryPrivateKey;
    address executor;
    uint256 executorPrivateKey;
    address permit2 = makeAddr("permit2");
    address testator = makeAddr("testator");

    uint8 maxEstates = 2;

    address beneficiary0 = makeAddr("beneficiary0");
    address token0 = makeAddr("token0");
    uint256 amount0 = 1000;

    address beneficiary1 = makeAddr("beneficiary1");
    address token1 = makeAddr("token1");
    uint256 amount1 = 2000;

    uint256 salt = 12345;

    JsonCidVerifier.TypedJsonObject willJson;
    string cid = "cid";

    uint256[2] pA = [1, 2];
    uint256[2][2] pB = [[3, 4], [5, 6]];
    uint256[2] pC = [7, 8];
    uint256[286] cidUploadPubSignals;
    uint256[296] willCreationPubSignals;

    Will.Estate[] estates;

    function setUp() public {
        notaryPrivateKey = 0x0123456789012345678901234567890123456789012345678901234567890123;
        notary = vm.addr(notaryPrivateKey);

        executorPrivateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        executor = vm.addr(executorPrivateKey);

        mockcidUploadVerifier = new MockCidUploadVerifier();
        mockWillCreationVerifier = new MockWillCreationVerifier();
        mockJsonCidVerifier = new MockJsonCidVerifier();

        factory = new WillFactory(
            address(mockcidUploadVerifier),
            address(mockWillCreationVerifier),
            address(mockJsonCidVerifier),
            notary,
            executor,
            permit2,
            maxEstates
        );

        estates.push(Will.Estate({ beneficiary: beneficiary0, token: token0, amount: amount0 }));

        estates.push(Will.Estate({ beneficiary: beneficiary1, token: token1, amount: amount1 }));

        string[] memory keys = new string[](5);
        keys[0] = "key0";
        keys[1] = "key1";
        keys[2] = "key2";
        keys[3] = "key3";
        keys[4] = "key4";

        JsonCidVerifier.JsonValue[] memory values = new JsonCidVerifier.JsonValue[](5);
        values[0] = JsonCidVerifier.JsonValue("value0", new uint256[](0), JsonCidVerifier.JsonValueType.STRING);
        values[1] = JsonCidVerifier.JsonValue("", new uint256[](16), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        values[2] = JsonCidVerifier.JsonValue("", new uint256[](0), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        values[3] = JsonCidVerifier.JsonValue("", new uint256[](269), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        values[4] = JsonCidVerifier.JsonValue("1234567890", new uint256[](0), JsonCidVerifier.JsonValueType.NUMBER);

        willJson = JsonCidVerifier.TypedJsonObject({ keys: keys, values: values });

        cidUploadPubSignals[0] = uint160(testator);
        for (uint256 i = 1; i < 286; i++) {
            cidUploadPubSignals[i] = 0;
        }

        uint256 pubSignalIdx = 0;
        willCreationPubSignals[pubSignalIdx++] = uint160(testator);
        for (uint8 i = 0; i < maxEstates; i++) {
            willCreationPubSignals[pubSignalIdx++] = uint160(estates[i].beneficiary);
            willCreationPubSignals[pubSignalIdx++] = uint160(estates[i].token);
            willCreationPubSignals[pubSignalIdx++] = estates[i].amount;
        }
        willCreationPubSignals[pubSignalIdx++] = uint64(salt);
        willCreationPubSignals[pubSignalIdx++] = uint64(salt >> 64);
        willCreationPubSignals[pubSignalIdx++] = uint64(salt >> 128);
        willCreationPubSignals[pubSignalIdx++] = uint64(salt >> 192);
        while (pubSignalIdx < 296) {
            willCreationPubSignals[pubSignalIdx++] = 0;
        }
    }

    function test_Constructor() public view {
        assertEq(address(factory.cidUploadVerifier()), address(mockcidUploadVerifier));
        assertEq(address(factory.willCreateVerifier()), address(mockWillCreationVerifier));
        assertEq(address(factory.jsonCidVerifier()), address(mockJsonCidVerifier));
        assertEq(factory.executor(), executor);
        assertEq(factory.permit2(), permit2);
    }

    function test_UploadCid_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        vm.expectEmit(true, false, false, false);
        emit WillFactory.CidUploaded(cid, block.timestamp);

        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        assertEq(factory.cidUploadedTimes(cid), block.timestamp);
    }

    function test_UploadCid_AlreadyUploaded() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyUploaded.selector, cid));
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_UploadCid_JsonCidInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(false);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.JsonCidInvalid.selector, cid));

        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_UploadCid_NotTestator() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotTestator.selector, executor, testator));
        vm.prank(executor);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_UploadCid_WrongCiphertext() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        // Change first element of ciphertext
        willJson.values[3].numberArray[0] = 999;

        vm.expectRevert(WillFactory.WrongCiphertext.selector);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_UploadCid_WrongInitializationVector() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        // Change first element of IV
        willJson.values[1].numberArray[0] = 888;

        vm.expectRevert(WillFactory.WrongInitializationVector.selector);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_UploadCid_CidUploadProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(false);

        vm.expectRevert(WillFactory.CidUploadProofInvalid.selector);

        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_RevokeUnnortarizedCid_Success() public {
        // Setup: Upload CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.UploadedCidRevoked(cid, block.timestamp);

        // Test: Revoke the unnotarized CID
        vm.prank(testator);
        factory.revokeUnnortarizedCid(pA, pB, pC, cidUploadPubSignals, cid);

        // Verify: CID is revoked (upload time reset to 0)
        assertEq(factory.cidUploadedTimes(cid), 0);
    }

    function test_RevokeUnnortarizedCid_NotTestator() public {
        // Setup: Upload CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        // Test: Wrong caller should revert
        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotTestator.selector, executor, testator));
        vm.prank(executor);
        factory.revokeUnnortarizedCid(pA, pB, pC, cidUploadPubSignals, cid);
    }

    function test_RevokeUnnortarizedCid_CidNotUploaded() public {
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, cid));

        vm.prank(testator);
        factory.revokeUnnortarizedCid(pA, pB, pC, cidUploadPubSignals, cid);
    }

    function test_RevokeUnnortarizedCid_AlreadyNotarized() public {
        // Setup: Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid);

        // Test: Should revert because CID is already notarized
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, cid));
        vm.prank(testator);
        factory.revokeUnnortarizedCid(pA, pB, pC, cidUploadPubSignals, cid);
    }

    function test_RevokeUnnortarizedCid_CidUploadProofInvalid() public {
        // Setup: Upload CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        // Test: Invalid proof should revert
        mockcidUploadVerifier.setShouldReturnTrue(false);
        vm.expectRevert(WillFactory.CidUploadProofInvalid.selector);
        vm.prank(testator);
        factory.revokeUnnortarizedCid(pA, pB, pC, cidUploadPubSignals, cid);
    }

    function test_NotarizeCid_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidNotarized(cid, block.timestamp);

        vm.prank(notary);
        factory.notarizeCid(cid);
    }

    function test_NotarizeCid_NotNotary() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotNotary.selector, address(this), notary));
        factory.notarizeCid(cid);
    }

    function test_NotarizeCid_AlreadyNotarized() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, cid));
        vm.prank(notary);
        factory.notarizeCid(cid);
    }

    function test_NotarizeCid_CidNotUploaded() public {
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, cid));

        vm.prank(notary);
        factory.notarizeCid(cid);
    }


    function test_CreateWill_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(true);

        address predictedAddress = factory.predictWill(testator, estates, salt);

        vm.expectEmit(true, true, false, true);
        emit WillFactory.WillCreated(cid, testator, predictedAddress);

        vm.prank(executor);
        address willAddress =
            factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);

        assertEq(factory.wills(cid), willAddress);
        assertEq(willAddress, predictedAddress);
    }

    function test_CreateWillCid_NotExecutor() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(true);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotExecutor.selector, address(this), executor));
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_CidNotUploaded() public {
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, cid));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_CidNotNotarized() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, cid));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_WrongCiphertext() public {
        // Setup: Upload and notarize the CID first
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(true);

         // Change first element of ciphertext
        willJson.values[3].numberArray[0] = 777;

        vm.expectRevert(WillFactory.WrongCiphertext.selector);
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_WrongInitializationVector() public {
        // Setup: Upload and notarize the CID first
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(true);

        // Change first element of IV
        willJson.values[1].numberArray[0] = 666;

        vm.expectRevert(WillFactory.WrongInitializationVector.selector);
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_WillCreationProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(false);

        vm.expectRevert(WillFactory.WillCreationProofInvalid.selector);
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_WillAlreadyExists() public {
        // Upload and notarize Cid
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        mockWillCreationVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        // Create first will
        vm.prank(executor);
        address firstWill =
            factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);

        // Try to create second will with same Cid
        vm.expectRevert(abi.encodeWithSelector(WillFactory.WillAlreadyExists.selector, cid, firstWill));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_RevokeNortarizedCid_Success() public {
        // Setup: Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.NotarizedCidRevoked(cid, block.timestamp);

        // Test: Revoke the notarized CID
        vm.prank(notary);
        factory.revokeNortarizedCid(cid);

        // Verify: Both upload and notarization times are reset to 0
        assertEq(factory.cidUploadedTimes(cid), 0);
        assertEq(factory.cidNotarizedTimes(cid), 0);
    }

    function test_RevokeNortarizedCid_NotNotary() public {
        // Setup: Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotNotary.selector, testator, notary));
        vm.prank(testator);
        factory.revokeNortarizedCid(cid);
    }

    function test_RevokeNortarizedCid_CidNotNotarized() public {
        // Setup: Upload CID but don't notarize
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, cid));
        vm.prank(notary);
        factory.revokeNortarizedCid(cid);
    }


    function _notarySign(string memory message) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(notaryPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function _executorSign(string memory message) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(executorPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }
}
