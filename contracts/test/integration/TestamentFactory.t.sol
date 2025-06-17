// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/TestamentFactory.sol";
import "src/Testament.sol";
import "src/Groth16Verifier.sol";
import "src/JSONCIDVerifier.sol";
import "mock/MockContracts.sol";

contract TestamentFactoryIntegrationTest is Test {
    TestamentFactory public factory;
    MockGroth16Verifier public mockTestatorVerifier;
    MockGroth16Verifier public mockDecryptionVerifier;
    MockJSONCIDVerifier public mockJSONCIDVerifier;

    address public executor;
    uint256 public executorPrivateKey;
    address public permit2 = makeAddr("permit2");
    address public testator = makeAddr("testator");

    address public beneficiary0 = makeAddr("beneficiary0");
    address public token0 = makeAddr("token0");
    uint256 public amount0 = 1000;

    address public beneficiary1 = makeAddr("beneficiary1");
    address public token1 = makeAddr("token1");
    uint256 public amount1 = 2000;

    address public beneficiary2 = makeAddr("beneficiary2");
    address public token2 = makeAddr("token2");
    uint256 public amount2 = 3000;

    string constant CID = "QmTest123";
    string constant TESTAMENT = '{"beneficiaries": ["0x123"]}';

    uint256[2] public pA = [1, 2];
    uint256[2][2] public pB = [[3, 4], [5, 6]];
    uint256[2] public pC = [7, 8];
    uint256[1] public pubSignals = [9];

    Testament.Estate[] public estates;

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
    }

    function test_FullWorkflow_UploadNotarizeCreate() public {
        uint256 salt = 12345;

        // Step 1: Upload CID
        mockJSONCIDVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);

        vm.expectEmit(true, true, false, true);
        emit TestamentFactory.CIDUploaded(CID, block.timestamp);

        factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);

        // Verify upload
        vm.prank(executor);
        uint256 uploadTime = factory.testatorValidateTimes(CID);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);
        bytes memory signature = _executorSign(CID);

        vm.expectEmit(true, false, false, true);
        emit TestamentFactory.CIDNotarized(CID, block.timestamp);

        factory.notarizeCID(CID, signature);

        // Verify notarization
        vm.prank(executor);
        uint256 notarizeTime = factory.executorValidateTimes(CID);
        assertEq(notarizeTime, block.timestamp);
        assertTrue(notarizeTime > uploadTime);

        // Step 3: Create Testament
        mockDecryptionVerifier.setShouldReturnTrue(true);

        address predictedAddress = factory.predictTestament(
            testator,
            estates,
            salt
        );

        vm.expectEmit(true, true, false, true);
        emit TestamentFactory.TestamentCreated(CID, testator, predictedAddress);

        address testamentAddress = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TESTAMENT,
            CID,
            testator,
            estates,
            salt
        );

        // Verify testament creation
        assertEq(factory.testaments(CID), testamentAddress);
        assertEq(testamentAddress, predictedAddress);

        // Verify testament contract exists and has correct properties
        Testament testament = Testament(testamentAddress);
        assertEq(address(testament.permit2()), permit2);
        assertEq(testament.testator(), testator);
        assertEq(testament.executor(), executor);
        assertFalse(testament.executed());

        (
            address testamentBeneficiary0,
            address testamentToken0,
            uint256 testamentAmount0
        ) = testament.estates(0);
        assertEq(testamentBeneficiary0, beneficiary0);
        assertEq(testamentToken0, token0);
        assertEq(testamentAmount0, amount0);

        (
            address testamentBeneficiary1,
            address testamentToken1,
            uint256 testamentAmount1
        ) = testament.estates(1);
        assertEq(testamentBeneficiary1, beneficiary1);
        assertEq(testamentToken1, token1);
        assertEq(testamentAmount1, amount1);
    }

    // function test_MultipleTestaments_DifferentCIDs() public {
    //     string memory cid1 = "QmTest1";
    //     string memory cid2 = "QmTest2";
    //     uint256 salt = 12345;

    //     // Setup verifiers
    //     mockJSONCIDVerifier.setShouldReturnTrue(true, "");
    //     mockTestatorVerifier.setShouldReturnTrue(true);
    //     mockDecryptionVerifier.setShouldReturnTrue(true);

    //     // Create first testament
    //     factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, cid1);
    //     vm.warp(block.timestamp + 1);

    //     bytes memory signature1 = _createSignature(cid1);
    //     factory.notarizeCID(cid1, signature1);

    //     address testament1 = factory.createTestament(
    //         pA,
    //         pB,
    //         pC,
    //         pubSignals,
    //         TESTAMENT,
    //         cid1,
    //         testator,
    //         testEstates,
    //         salt
    //     );

    //     // Create second testament
    //     vm.warp(block.timestamp + 1);
    //     factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, cid2);
    //     vm.warp(block.timestamp + 1);

    //     bytes memory signature2 = _createSignature(cid2);
    //     factory.notarizeCID(cid2, signature2);

    //     address testament2 = factory.createTestament(
    //         pA,
    //         pB,
    //         pC,
    //         pubSignals,
    //         TESTAMENT,
    //         cid2,
    //         testator,
    //         testEstates,
    //         salt
    //     );

    //     // Verify both testaments exist and are different
    //     // assertEq(factory.testaments(cid1), testament1);
    //     // assertEq(factory.testaments(cid2), testament2);
    //     // assertTrue(testament1 != testament2);
    // }

    function test_WorkflowWithTimingConstraints() public {
        uint256 salt = 12345;

        mockJSONCIDVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);

        // Upload at time T
        uint256 startTime = block.timestamp;
        factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);

        // Try to create testament without notarization - should fail
        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.CIDNotValidatedByExecutor.selector,
                CID
            )
        );
        factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TESTAMENT,
            CID,
            testator,
            estates,
            salt
        );

        // Notarize at time T (same as upload) - should fail creation
        bytes memory signature = _executorSign(CID);
        factory.notarizeCID(CID, signature);

        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.CIDNotValidatedByExecutor.selector,
                CID
            )
        );
        factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TESTAMENT,
            CID,
            testator,
            estates,
            salt
        );

        // Fast forward time and re-notarize - should succeed
        vm.warp(startTime + 100);
        factory.notarizeCID(CID, signature);

        address testamentAddress = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TESTAMENT,
            CID,
            testator,
            estates,
            salt
        );

        assertEq(factory.testaments(CID), testamentAddress);
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
