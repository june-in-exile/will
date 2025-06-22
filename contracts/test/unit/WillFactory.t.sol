// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "mock/MockContracts.sol";

contract WillFactoryUnitTest is Test {
    WillFactory factory;
    MockGroth16Verifier mockuploadCIDVerifier;
    MockGroth16Verifier mockDecryptionVerifier;
    MockJSONCIDVerifier mockJsonCidVerifier;

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

    JSONCIDVerifier.JsonObject willJson;
    string cid = "cid";

    uint256[2] pA = [1, 2];
    uint256[2][2] pB = [[3, 4], [5, 6]];
    uint256[2] pC = [7, 8];
    uint256[1] pubSignals = [9];

    Will.Estate[] estates;

    function setUp() public {
        executorPrivateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        executor = vm.addr(executorPrivateKey);

        mockuploadCIDVerifier = new MockGroth16Verifier();
        mockDecryptionVerifier = new MockGroth16Verifier();
        mockJsonCidVerifier = new MockJSONCIDVerifier();

        factory = new WillFactory(
            address(mockuploadCIDVerifier),
            address(mockDecryptionVerifier),
            address(mockJsonCidVerifier),
            executor,
            permit2
        );

        estates.push(
            Will.Estate({
                beneficiary: beneficiary0,
                token: token0,
                amount: amount0
            })
        );

        estates.push(
            Will.Estate({
                beneficiary: beneficiary1,
                token: token1,
                amount: amount1
            })
        );

        string[] memory keys = new string[](1);
        keys[0] = "salt";

        string[] memory values = new string[](1);
        values[0] = "12345";

        willJson = JSONCIDVerifier.JsonObject({keys: keys, values: values});
    }

    function test_Constructor() public view {
        assertEq(
            address(factory.uploadCIDVerifier()),
            address(mockuploadCIDVerifier)
        );
        assertEq(
            address(factory.createWillVerifier()),
            address(mockDecryptionVerifier)
        );
        assertEq(
            address(factory.jsonCidVerifier()),
            address(mockJsonCidVerifier)
        );
        assertEq(factory.executor(), executor);
        assertEq(factory.permit2(), permit2);
    }

    function test_UploadCID_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCIDVerifier.setShouldReturnTrue(true);

        uint256 expectedTimestamp = block.timestamp;
        vm.expectEmit(false, false, false, false);
        emit WillFactory.CIDUploaded(cid, expectedTimestamp);

        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid);

        vm.prank(executor);
        assertEq(factory.testatorValidateTimes(cid), block.timestamp);
    }

    function test_UploadCID_JSONCIDInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(false);

        vm.expectRevert(
            abi.encodeWithSelector(
                WillFactory.JSONCIDInvalid.selector,
                cid,
                "Invalid format"
            )
        );

        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid);
    }

    function test_UploadCID_TestatorProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCIDVerifier.setShouldReturnTrue(false);

        vm.expectRevert(WillFactory.TestatorProofInvalid.selector);

        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid);
    }

    function test_NotarizeCID_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCIDVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CIDNotarized(cid, block.timestamp);

        bytes memory executorSignature = _executorSign(cid);
        factory.notarizeCID(cid, executorSignature);
    }

    function test_NotarizeCID_CIDNotValidatedByTestator() public {
        bytes memory signature = abi.encodePacked(
            bytes32(0),
            bytes32(0),
            uint8(0)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                WillFactory.CIDNotValidatedByTestator.selector,
                cid
            )
        );

        factory.notarizeCID(cid, signature);
    }

    function test_CreateWill_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCIDVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory executorSignature = _executorSign(cid);
        factory.notarizeCID(cid, executorSignature);

        mockDecryptionVerifier.setShouldReturnTrue(true);

        address predictedAddress = factory.predictWill(testator, estates, salt);

        vm.expectEmit(true, true, false, true);
        emit WillFactory.WillCreated(cid, testator, predictedAddress);

        address willAddress = factory.createWill(
            pA,
            pB,
            pC,
            pubSignals,
            willJson,
            cid,
            testator,
            estates,
            salt
        );

        assertEq(factory.wills(cid), willAddress);
        assertEq(willAddress, predictedAddress);
    }

    function test_CreateWill_CIDNotValidatedByTestator() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                WillFactory.CIDNotValidatedByTestator.selector,
                cid
            )
        );

        factory.createWill(
            pA,
            pB,
            pC,
            pubSignals,
            willJson,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateWill_CIDNotValidatedByExecutor() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCIDVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid);

        vm.expectRevert(
            abi.encodeWithSelector(
                WillFactory.CIDNotValidatedByExecutor.selector,
                cid
            )
        );

        factory.createWill(
            pA,
            pB,
            pC,
            pubSignals,
            willJson,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateWill_DecryptionProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCIDVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory executorSignature = _executorSign(cid);
        factory.notarizeCID(cid, executorSignature);

        mockDecryptionVerifier.setShouldReturnTrue(false);

        vm.expectRevert(WillFactory.DecryptionProofInvalid.selector);

        factory.createWill(
            pA,
            pB,
            pC,
            pubSignals,
            willJson,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateWill_WillAlreadyExists() public {
        // Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCIDVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory executorSignature = _executorSign(cid);
        factory.notarizeCID(cid, executorSignature);

        // Create first will
        address firstWill = factory.createWill(
            pA,
            pB,
            pC,
            pubSignals,
            willJson,
            cid,
            testator,
            estates,
            salt
        );

        // Try to create second will with same CID
        vm.expectRevert(
            abi.encodeWithSelector(
                WillFactory.WillAlreadyExists.selector,
                cid,
                firstWill
            )
        );

        factory.createWill(
            pA,
            pB,
            pC,
            pubSignals,
            willJson,
            cid,
            testator,
            estates,
            salt + 1
        );
    }

    function test_CreateWill_DifferentSalts() public {
        uint256 salt1 = 13579;
        uint256 salt2 = 24680;

        // Different salts result in different wills
        string[] memory keys1 = new string[](1);
        keys1[0] = "salt";

        string[] memory values1 = new string[](1);
        values1[0] = "13579";

        JSONCIDVerifier.JsonObject memory willJson1 = JSONCIDVerifier
            .JsonObject({keys: keys1, values: values1});

        string[] memory keys2 = new string[](1);
        keys2[0] = "salt";

        string[] memory values2 = new string[](1);
        values2[0] = "24680";

        JSONCIDVerifier.JsonObject memory willJson2 = JSONCIDVerifier
            .JsonObject({keys: keys2, values: values2});

        // Different wills result in different cids
        string memory cid1 = "cid1";
        string memory cid2 = "cid2";

        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockuploadCIDVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);

        // Create first will
        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid1);
        vm.warp(block.timestamp + 1);

        bytes memory signature1 = _executorSign(cid1);
        factory.notarizeCID(cid1, signature1);
        vm.warp(block.timestamp + 1);

        address willContract1 = factory.createWill(
            pA,
            pB,
            pC,
            pubSignals,
            willJson1,
            cid1,
            testator,
            estates,
            salt1
        );

        // Create second will
        vm.warp(block.timestamp + 1);

        factory.uploadCID(pA, pB, pC, pubSignals, willJson, cid2);
        vm.warp(block.timestamp + 1);

        bytes memory signature2 = _executorSign(cid2);
        factory.notarizeCID(cid2, signature2);
        vm.warp(block.timestamp + 1);

        address willContract2 = factory.createWill(
            pA,
            pB,
            pC,
            pubSignals,
            willJson2,
            cid2,
            testator,
            estates,
            salt2
        );

        // Verify both wills exist and are different
        assertEq(factory.wills(cid1), willContract1);
        assertEq(factory.wills(cid2), willContract2);
        assertTrue(willContract1 != willContract2);
    }

    function _executorSign(
        string memory message
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            executorPrivateKey,
            ethSignedMessageHash
        );
        return abi.encodePacked(r, s, v);
    }
}
