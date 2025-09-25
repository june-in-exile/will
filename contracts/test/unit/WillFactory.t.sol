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
    uint256[285] cidUploadPubSignals;
    uint256[292] willCreationPubSignals;

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
            permit2
        );

        estates.push(Will.Estate({ beneficiary: beneficiary0, token: token0, amount: amount0 }));

        estates.push(Will.Estate({ beneficiary: beneficiary1, token: token1, amount: amount1 }));

        string[] memory keys = new string[](2);
        keys[0] = "text";
        keys[1] = "timestamp";

        JsonCidVerifier.JsonValue[] memory values = new JsonCidVerifier.JsonValue[](2);
        values[0] = JsonCidVerifier.JsonValue("hello world", JsonCidVerifier.JsonValueType(0));
        values[1] = JsonCidVerifier.JsonValue("1753824424", JsonCidVerifier.JsonValueType(1));

        willJson = JsonCidVerifier.TypedJsonObject({ keys: keys, values: values });

        for (uint256 i = 0; i < 285; i++) {
            cidUploadPubSignals[i] = i + 1;
        }
        for (uint256 i = 0; i < 292; i++) {
            willCreationPubSignals[i] = i + 1;
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

        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.prank(executor);
        assertEq(factory.cidUploadedTimes(cid), block.timestamp);
    }

    function test_UploadCid_AlreadyUploaded() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyUploaded.selector, cid));
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_UploadCid_JsonCidInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(false);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.JsonCidInvalid.selector, cid));

        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_UploadCid_CidUploadProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(false);

        vm.expectRevert(WillFactory.CidUploadProofInvalid.selector);

        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);
    }

    function test_NotarizeCid_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidNotarized(cid, block.timestamp);

        bytes memory notarySignature = _notarySign(cid);
        vm.prank(executor);
        factory.notarizeCid(cid, notarySignature);
    }

    function test_NotarizeCid_UnauthorizedCaller() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        bytes memory notarySignature = _notarySign(cid);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.UnauthorizedCaller.selector, address(this), executor));
        factory.notarizeCid(cid, notarySignature);
    }

    function test_NotarizeCid_AlreadyNotarized() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory notarySignature = _notarySign(cid);
        vm.prank(executor);
        factory.notarizeCid(cid, notarySignature);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, cid));
        vm.prank(executor);
        factory.notarizeCid(cid, notarySignature);
    }

    function test_NotarizeCid_CidNotValidatedByTestator() public {
        bytes memory signature = abi.encodePacked(bytes32(0), bytes32(0), uint8(0));

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotValidatedByTestator.selector, cid));

        vm.prank(executor);
        factory.notarizeCid(cid, signature);
    }

    function test_NotarizeCid_SignatureInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory executorSignature = _executorSign(cid);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.SignatureInvalid.selector, cid, executorSignature, notary));
        vm.prank(executor);
        factory.notarizeCid(cid, executorSignature);
    }

    function test_CreateWill_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory notarySignature = _notarySign(cid);
        vm.prank(executor);
        factory.notarizeCid(cid, notarySignature);

        mockWillCreationVerifier.setShouldReturnTrue(true);

        address predictedAddress = factory.predictWill(testator, estates, salt);

        vm.expectEmit(true, true, false, true);
        emit WillFactory.WillCreated(cid, testator, predictedAddress);

        vm.prank(executor);
        address willAddress =
            factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid, testator, estates, salt);

        assertEq(factory.wills(cid), willAddress);
        assertEq(willAddress, predictedAddress);
    }

    function test_CreateWillCid_UnauthorizedCaller() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory notarySignature = _notarySign(cid);
        vm.prank(executor);
        factory.notarizeCid(cid, notarySignature);

        mockWillCreationVerifier.setShouldReturnTrue(true);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.UnauthorizedCaller.selector, address(this), executor));
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid, testator, estates, salt);
    }

    function test_CreateWill_CidNotValidatedByTestator() public {
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotValidatedByTestator.selector, cid));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid, testator, estates, salt);
    }

    function test_CreateWill_CidNotValidatedByExecutor() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotValidatedByExecutor.selector, cid));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid, testator, estates, salt);
    }

    function test_CreateWill_WillCreationProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory notarySignature = _notarySign(cid);
        vm.prank(executor);
        factory.notarizeCid(cid, notarySignature);

        mockWillCreationVerifier.setShouldReturnTrue(false);

        vm.expectRevert(WillFactory.WillCreationProofInvalid.selector);
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid, testator, estates, salt);
    }

    function test_CreateWill_WillAlreadyExists() public {
        // Upload and notarize Cid
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        mockWillCreationVerifier.setShouldReturnTrue(true);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory notarySignature = _notarySign(cid);
        vm.prank(executor);
        factory.notarizeCid(cid, notarySignature);

        // Create first will
        vm.prank(executor);
        address firstWill =
            factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid, testator, estates, salt);

        // Try to create second will with same Cid
        vm.expectRevert(abi.encodeWithSelector(WillFactory.WillAlreadyExists.selector, cid, firstWill));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid, testator, estates, salt + 1);
    }

    function test_CreateWill_DifferentSalts() public {
        uint256 salt1 = 13579;
        uint256 salt2 = 24680;

        // Different salts result in different wills
        string[] memory keys1 = new string[](1);
        keys1[0] = "salt";

        JsonCidVerifier.JsonValue[] memory values1 = new JsonCidVerifier.JsonValue[](1);
        values1[0] = JsonCidVerifier.JsonValue("13579", JsonCidVerifier.JsonValueType(1));

        JsonCidVerifier.TypedJsonObject memory willJson1 =
            JsonCidVerifier.TypedJsonObject({ keys: keys1, values: values1 });

        string[] memory keys2 = new string[](1);
        keys2[0] = "salt";

        JsonCidVerifier.JsonValue[] memory values2 = new JsonCidVerifier.JsonValue[](1);
        values2[0] = JsonCidVerifier.JsonValue("24680", JsonCidVerifier.JsonValueType(1));

        JsonCidVerifier.TypedJsonObject memory willJson2 =
            JsonCidVerifier.TypedJsonObject({ keys: keys2, values: values2 });

        // Different wills result in different cids
        string memory cid1 = "cid1";
        string memory cid2 = "cid2";

        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        mockWillCreationVerifier.setShouldReturnTrue(true);

        // Create first will
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid1);
        vm.warp(block.timestamp + 1);

        bytes memory signature1 = _notarySign(cid1);
        vm.prank(executor);
        factory.notarizeCid(cid1, signature1);
        vm.warp(block.timestamp + 1);

        vm.prank(executor);
        address willContract1 =
            factory.createWill(pA, pB, pC, willCreationPubSignals, willJson1, cid1, testator, estates, salt1);

        // Create second will
        vm.warp(block.timestamp + 1);

        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid2);
        vm.warp(block.timestamp + 1);

        bytes memory signature2 = _notarySign(cid2);
        vm.prank(executor);
        factory.notarizeCid(cid2, signature2);
        vm.warp(block.timestamp + 1);

        vm.prank(executor);
        address willContract2 =
            factory.createWill(pA, pB, pC, willCreationPubSignals, willJson2, cid2, testator, estates, salt2);

        // Verify both wills exist and are different
        assertEq(factory.wills(cid1), willContract1);
        assertEq(factory.wills(cid2), willContract2);
        assertTrue(willContract1 != willContract2);
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
