// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/TestamentFactory.sol";
import "src/Testament.sol";
import "src/Groth16Verifier.sol";
import "src/JSONCIDVerifier.sol";

// Mock contracts for testing
contract MockGroth16Verifier {
    bool public shouldReturnTrue = true;

    function setShouldReturnTrue(bool _shouldReturnTrue) external {
        shouldReturnTrue = _shouldReturnTrue;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[1] calldata
    ) external view returns (bool) {
        return shouldReturnTrue;
    }
}

contract MockJSONCIDVerifier {
    bool public shouldReturnTrue = true;
    string public reason = "";

    function setShouldReturnTrue(
        bool _shouldReturnTrue,
        string memory _reason
    ) external {
        shouldReturnTrue = _shouldReturnTrue;
        reason = _reason;
    }

    function verifyCID(
        string memory,
        string memory
    ) external view returns (bool, string memory) {
        return (shouldReturnTrue, reason);
    }
}

contract TestamentFactoryIntegrationTest is Test {
    TestamentFactory public factory;
    MockGroth16Verifier public mockTestatorVerifier;
    MockGroth16Verifier public mockDecryptionVerifier;
    MockJSONCIDVerifier public mockJSONCIDVerifier;

    address public executor;
    uint256 public executorPrivateKey;
    address public permit2 = makeAddr("permit2");
    address public testator = makeAddr("testator");

    string constant TEST_CID = "QmTest123";
    string constant TEST_TESTAMENT = '{"beneficiaries": ["0x123"]}';

    uint256[2] public pA = [1, 2];
    uint256[2][2] public pB = [[3, 4], [5, 6]];
    uint256[2] public pC = [7, 8];
    uint256[1] public pubSignals = [9];

    Testament.Estate[] public testEstates;

    function setUp() public {
        executorPrivateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        executor = vm.addr(executorPrivateKey);

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

        testEstates.push(
            Testament.Estate({
                token: makeAddr("token1"),
                amount: 1000,
                beneficiary: makeAddr("beneficiary1")
            })
        );

        testEstates.push(
            Testament.Estate({
                token: makeAddr("token2"),
                amount: 2000,
                beneficiary: makeAddr("beneficiary2")
            })
        );
    }

    function test_FullWorkflow_UploadNotarizeCreate() public {
        uint256 salt = 12345;

        // Step 1: Upload CID
        mockJSONCIDVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);

        vm.expectEmit(true, false, false, true);
        emit TestamentFactory.CIDUploaded(TEST_CID, block.timestamp);

        factory.uploadCID(pA, pB, pC, pubSignals, TEST_TESTAMENT, TEST_CID);

        // Verify upload
        vm.prank(executor);
        uint256 uploadTime = factory.testatorValidateTimes(TEST_CID);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);

        bytes32 messageHash = keccak256(abi.encodePacked(TEST_CID));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            executorPrivateKey,
            ethSignedMessageHash
        );
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectEmit(true, false, false, true);
        emit TestamentFactory.CIDNotarized(TEST_CID, block.timestamp);

        factory.notarizeCID(TEST_CID, signature);

        // Verify notarization
        vm.prank(executor);
        uint256 notarizeTime = factory.executorValidateTimes(TEST_CID);
        assertEq(notarizeTime, block.timestamp);
        assertTrue(notarizeTime > uploadTime);

        // Step 3: Create Testament
        mockDecryptionVerifier.setShouldReturnTrue(true);

        address predictedAddress = factory.predictTestament(
            testator,
            testEstates,
            salt
        );

        vm.expectEmit(true, true, false, true);
        emit TestamentFactory.TestamentCreated(
            TEST_CID,
            testator,
            predictedAddress
        );

        address testamentAddress = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TEST_TESTAMENT,
            TEST_CID,
            testator,
            testEstates,
            salt
        );

        // Verify testament creation
        assertEq(factory.testaments(TEST_CID), testamentAddress);
        assertEq(testamentAddress, predictedAddress);

        // Verify testament contract exists and has correct properties
        Testament testament = Testament(testamentAddress);
        assertEq(testament.testator(), testator);
        assertEq(testament.executor(), executor);
    }

    function test_MultipleTestaments_DifferentCIDs() public {
        string memory cid1 = "QmTest1";
        string memory cid2 = "QmTest2";
        uint256 salt = 12345;

        // Setup verifiers
        mockJSONCIDVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);

        // Create first testament
        factory.uploadCID(pA, pB, pC, pubSignals, TEST_TESTAMENT, cid1);
        vm.warp(block.timestamp + 1);

        bytes memory signature1 = _createSignature(cid1);
        factory.notarizeCID(cid1, signature1);

        address testament1 = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TEST_TESTAMENT,
            cid1,
            testator,
            testEstates,
            salt
        );

        // Create second testament
        vm.warp(block.timestamp + 1);
        factory.uploadCID(pA, pB, pC, pubSignals, TEST_TESTAMENT, cid2);
        vm.warp(block.timestamp + 1);

        bytes memory signature2 = _createSignature(cid2);
        factory.notarizeCID(cid2, signature2);

        address testament2 = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TEST_TESTAMENT,
            cid2,
            testator,
            testEstates,
            salt
        );

        // Verify both testaments exist and are different
        assertEq(factory.testaments(cid1), testament1);
        assertEq(factory.testaments(cid2), testament2);
        assertTrue(testament1 != testament2);
    }

    function test_WorkflowWithMultipleEstates() public {
        uint256 salt = 12345;

        // Add more estates
        testEstates.push(
            Testament.Estate({
                token: makeAddr("token3"),
                amount: 3000,
                beneficiary: makeAddr("beneficiary3")
            })
        );

        // Setup and execute full workflow
        mockJSONCIDVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);

        factory.uploadCID(pA, pB, pC, pubSignals, TEST_TESTAMENT, TEST_CID);
        vm.warp(block.timestamp + 1);

        bytes memory signature = _createSignature(TEST_CID);
        factory.notarizeCID(TEST_CID, signature);

        address testamentAddress = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TEST_TESTAMENT,
            TEST_CID,
            testator,
            testEstates,
            salt
        );

        // Verify testament was created with all estates
        assertEq(factory.testaments(TEST_CID), testamentAddress);

        Testament testament = Testament(testamentAddress);
        assertEq(testament.testator(), testator);
        assertEq(testament.executor(), executor);
    }

    function test_WorkflowWithTimingConstraints() public {
        uint256 salt = 12345;

        mockJSONCIDVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);

        // Upload at time T
        uint256 startTime = block.timestamp;
        factory.uploadCID(pA, pB, pC, pubSignals, TEST_TESTAMENT, TEST_CID);

        // Try to create testament without notarization - should fail
        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.CIDNotValidatedByExecutor.selector,
                TEST_CID
            )
        );
        factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TEST_TESTAMENT,
            TEST_CID,
            testator,
            testEstates,
            salt
        );

        // Notarize at time T (same as upload) - should fail creation
        bytes memory signature = _createSignature(TEST_CID);
        factory.notarizeCID(TEST_CID, signature);

        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.CIDNotValidatedByExecutor.selector,
                TEST_CID
            )
        );
        factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TEST_TESTAMENT,
            TEST_CID,
            testator,
            testEstates,
            salt
        );

        // Fast forward time and re-notarize - should succeed
        vm.warp(startTime + 100);
        factory.notarizeCID(TEST_CID, signature);

        address testamentAddress = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TEST_TESTAMENT,
            TEST_CID,
            testator,
            testEstates,
            salt
        );

        assertEq(factory.testaments(TEST_CID), testamentAddress);
    }

    function _createSignature(
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
