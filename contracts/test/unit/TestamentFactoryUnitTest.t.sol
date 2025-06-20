// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/TestamentFactory.sol";
import "src/Testament.sol";
import "mock/MockContracts.sol";

contract TestamentFactoryUnitTest is Test {
    TestamentFactory factory;
    MockGroth16Verifier mockTestatorVerifier;
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

    JSONCIDVerifier.JsonObject testamentJson;
    string cid = "cid";

    uint256[2] pA = [1, 2];
    uint256[2][2] pB = [[3, 4], [5, 6]];
    uint256[2] pC = [7, 8];
    uint256[1] pubSignals = [9];

    Testament.Estate[] estates;

    function setUp() public {
        executorPrivateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        executor = vm.addr(executorPrivateKey);

        mockTestatorVerifier = new MockGroth16Verifier();
        mockDecryptionVerifier = new MockGroth16Verifier();
        mockJsonCidVerifier = new MockJSONCIDVerifier();

        factory = new TestamentFactory(
            address(mockTestatorVerifier),
            address(mockDecryptionVerifier),
            address(mockJsonCidVerifier),
            executor,
            permit2
        );

        estates.push(
            Testament.Estate({
                beneficiary: beneficiary0,
                token: token0,
                amount: amount0
            })
        );

        estates.push(
            Testament.Estate({
                beneficiary: beneficiary1,
                token: token1,
                amount: amount1
            })
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

    function test_Constructor() public view {
        assertEq(
            address(factory.testatorVerifier()),
            address(mockTestatorVerifier)
        );
        assertEq(
            address(factory.decryptionVerifier()),
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
        mockTestatorVerifier.setShouldReturnTrue(true);

        uint256 expectedTimestamp = block.timestamp;
        vm.expectEmit(false, false, false, false);
        emit TestamentFactory.CIDUploaded(cid, expectedTimestamp);

        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

        vm.prank(executor);
        assertEq(factory.testatorValidateTimes(cid), block.timestamp);
    }

    function test_UploadCID_JSONCIDInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(false);

        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.JSONCIDInvalid.selector,
                cid,
                "Invalid format"
            )
        );

        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);
    }

    function test_UploadCID_TestatorProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockTestatorVerifier.setShouldReturnTrue(false);

        vm.expectRevert(TestamentFactory.TestatorProofInvalid.selector);

        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);
    }

    function test_NotarizeCID_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

        vm.expectEmit(true, false, false, true);
        emit TestamentFactory.CIDNotarized(cid, block.timestamp);

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
                TestamentFactory.CIDNotValidatedByTestator.selector,
                cid
            )
        );

        factory.notarizeCID(cid, signature);
    }

    function test_CreateTestament_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory executorSignature = _executorSign(cid);
        factory.notarizeCID(cid, executorSignature);

        mockDecryptionVerifier.setShouldReturnTrue(true);

        address predictedAddress = factory.predictTestament(
            testator,
            estates,
            salt
        );

        vm.expectEmit(true, true, false, true);
        emit TestamentFactory.TestamentCreated(cid, testator, predictedAddress);

        address testamentAddress = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testamentJson,
            cid,
            testator,
            estates,
            salt
        );

        assertEq(factory.testaments(cid), testamentAddress);
        assertEq(testamentAddress, predictedAddress);
    }

    function test_CreateTestament_CIDNotValidatedByTestator() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.CIDNotValidatedByTestator.selector,
                cid
            )
        );

        factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testamentJson,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateTestament_CIDNotValidatedByExecutor() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.CIDNotValidatedByExecutor.selector,
                cid
            )
        );

        factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testamentJson,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateTestament_DecryptionProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory executorSignature = _executorSign(cid);
        factory.notarizeCID(cid, executorSignature);

        mockDecryptionVerifier.setShouldReturnTrue(false);

        vm.expectRevert(TestamentFactory.DecryptionProofInvalid.selector);

        factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testamentJson,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateTestament_TestamentAlreadyExists() public {
        // Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockTestatorVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

        vm.warp(block.timestamp + 1);

        bytes memory executorSignature = _executorSign(cid);
        factory.notarizeCID(cid, executorSignature);

        // Create first testament
        address firstTestament = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testamentJson,
            cid,
            testator,
            estates,
            salt
        );

        // Try to create second testament with same CID
        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.TestamentAlreadyExists.selector,
                cid,
                firstTestament
            )
        );

        factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testamentJson,
            cid,
            testator,
            estates,
            salt + 1
        );
    }

    function test_CreateTestament_DifferentSalts() public {
        uint256 salt1 = 13579;
        uint256 salt2 = 24680;

        // Different salts result in different testaments
        string[] memory keys1 = new string[](1);
        keys1[0] = "salt";

        string[] memory values1 = new string[](1);
        values1[0] = "13579";

        JSONCIDVerifier.JsonObject memory testamentJson1 = JSONCIDVerifier
            .JsonObject({keys: keys1, values: values1});

        string[] memory keys2 = new string[](1);
        keys2[0] = "salt";

        string[] memory values2 = new string[](1);
        values2[0] = "24680";

        JSONCIDVerifier.JsonObject memory testamentJson2 = JSONCIDVerifier
            .JsonObject({keys: keys2, values: values2});

        // Different testaments result in different cids
        string memory cid1 = "cid1";
        string memory cid2 = "cid2";

        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockTestatorVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);

        // Create first testament
        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid1);
        vm.warp(block.timestamp + 1);

        bytes memory signature1 = _executorSign(cid1);
        factory.notarizeCID(cid1, signature1);
        vm.warp(block.timestamp + 1);

        address testamentContract1 = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testamentJson1,
            cid1,
            testator,
            estates,
            salt1
        );

        // Create second testament
        vm.warp(block.timestamp + 1);

        factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid2);
        vm.warp(block.timestamp + 1);

        bytes memory signature2 = _executorSign(cid2);
        factory.notarizeCID(cid2, signature2);
        vm.warp(block.timestamp + 1);

        address testamentContract2 = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testamentJson2,
            cid2,
            testator,
            estates,
            salt2
        );

        // Verify both testaments exist and are different
        assertEq(factory.testaments(cid1), testamentContract1);
        assertEq(factory.testaments(cid2), testamentContract2);
        assertTrue(testamentContract1 != testamentContract2);
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
