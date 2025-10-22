// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "forge-std/console.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "src/CidUploadVerifier.sol";
import "src/WillCreationVerifier.sol";
import "src/JsonCidVerifier.sol";


/*
 * @note Prerequisite for this test:
 *  1. `make fork` a virtual env
 *  2. `make deploy` necessary contracts
 *  3. `make all` in apps/backend to generate test data (e.g., encrypted will, ZKP).
 */
contract WillFactoryIntegrationTest is Test {
    struct CidUploadProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[290] pubSignals;
    }

    struct WillCreationProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[300] pubSignals;
    }

    WillFactory willFactory;
    CidUploadVerifier cidUploadVerifier;
    WillCreationVerifier willCreateVerifier;
    JsonCidVerifier jsonCidVerifier;

    address notary;
    uint256 notaryPrivateKey;
    address oracle;
    uint256 oraclePrivateKey;
    address permit2;
    uint8 maxEstates;

    struct TestVector {
        string name;
        address testator;
        address executor;
        Will.Estate[] estates;
        uint256 salt;
        JsonCidVerifier.TypedJsonObject willTypedJsonObj;
        string cid;
        CidUploadProofData cidUploadProof;
        WillCreationProofData willCreationProof;
    }

    TestVector[] testVectors;

    function setUp() public {
        CidUploadVerifierConstants1 cidUploadConstants1 = new CidUploadVerifierConstants1();
        CidUploadVerifierConstants2 cidUploadConstants2 = new CidUploadVerifierConstants2();
        cidUploadVerifier = new CidUploadVerifier(address(cidUploadConstants1), address(cidUploadConstants2));
        WillCreationVerifierConstants1 willCreationConstants1 = new WillCreationVerifierConstants1();
        WillCreationVerifierConstants2 willCreationConstants2 = new WillCreationVerifierConstants2();
        willCreateVerifier = new WillCreationVerifier(address(willCreationConstants1), address(willCreationConstants2));
        jsonCidVerifier = new JsonCidVerifier();

        // Read addresses from environment variables
        notaryPrivateKey = uint256(vm.envBytes32("NOTARY_PRIVATE_KEY"));
        notary = vm.addr(notaryPrivateKey);
        oraclePrivateKey = uint256(vm.envBytes32("ORACLE_PRIVATE_KEY"));
        oracle = vm.addr(oraclePrivateKey);
        permit2 = vm.envAddress("PERMIT2");
        maxEstates = uint8(vm.envUint("MAX_ESTATES"));

        willFactory = new WillFactory(
            address(cidUploadVerifier), address(willCreateVerifier), address(jsonCidVerifier), notary, oracle, permit2, maxEstates
        );

        _setupTestVectors();
    }

    function _setupTestVectors() internal {
        {
            JsonCidVerifier.TypedJsonObject memory willTypedJsonObj = _getEncryptedWillFromFile();
            CidUploadProofData memory cidUploadProof = _getCidUploadProofFromFiles();
            WillCreationProofData memory willCreationProof = _getWillCreationProofFromFiles();

            (
                address testator,
                address executor,
                Will.Estate[] memory estates,
                uint256 salt,
                string memory cid
            ) = _getTestDataFromEnv();

            testVectors.push(
                TestVector({
                    name: "20251023 Will",
                    testator: testator,
                    executor: executor,
                    estates: estates,
                    salt: salt,
                    willTypedJsonObj: willTypedJsonObj,
                    cid: cid,
                    cidUploadProof: cidUploadProof,
                    willCreationProof: willCreationProof
                })
            );
        }
    }

    function test_FullWorkflow_UploadNotarizeCreate() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidUploaded(tv.cid, block.timestamp);

        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Verify upload
        uint256 uploadTime = willFactory.cidUploadedTimes(tv.cid);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidNotarized(tv.cid, block.timestamp);

        vm.prank(notary);
        willFactory.notarizeCid(tv.cid);

        // Verify notarization
        uint256 notarizeTime = willFactory.cidNotarizedTimes(tv.cid);
        assertEq(notarizeTime, block.timestamp);
        assertTrue(notarizeTime > uploadTime);

        // Step 3: Create Will
        address predictedAddress = willFactory.predictWill(tv.testator, tv.executor, tv.estates, tv.salt);

        vm.expectEmit(true, true, false, true);
        emit WillFactory.WillCreated(tv.cid, tv.testator, predictedAddress);

        vm.prank(tv.executor);
        address willAddress = willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Verify will creation
        assertEq(willFactory.wills(tv.cid), willAddress);
        assertEq(willAddress, predictedAddress);

        // Verify will contract exists and has correct properties
        Will will = Will(willAddress);
        assertEq(address(will.permit2()), permit2);
        assertEq(will.testator(), tv.testator);
        assertEq(will.executor(), tv.executor);
        assertFalse(will.validProofOfDeath());

        assertTrue(_compareEstateArraysHash(will.getAllEstates(), tv.estates));
    }

    function test_WorkflowWithTimingConstraints() public {
        TestVector memory tv = testVectors[0];

        // Upload at time T
        uint256 startTime = block.timestamp;
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Try to create will without notarization - should fail
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, tv.cid));
        vm.prank(tv.executor);
        willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Notarize at time T (same as upload) - should fail
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, tv.cid));
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, tv.cid));
        vm.prank(tv.executor);
        willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Fast forward time and notarize - should success
        vm.warp(startTime + 1);
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid);

        // Fast forward time and re-notarize - should fail
        vm.warp(startTime + 1);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, tv.cid));
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid);

        // Create Will with "notarization time > upload time" - should success
        vm.prank(tv.executor);
        address willAddress = willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        assertEq(willFactory.wills(tv.cid), willAddress);
    }

    function test_RevokeUnnortarizedCid_Integration() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Verify upload
        uint256 uploadTime = willFactory.cidUploadedTimes(tv.cid);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Revoke the unnotarized CID
        vm.expectEmit(true, false, false, true);
        emit WillFactory.UploadedCidRevoked(tv.cid, block.timestamp);

        vm.prank(tv.testator);
        willFactory.revokeUnnortarizedCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.cid
        );

        // Verify revocation - upload time should be reset to 0
        assertEq(willFactory.cidUploadedTimes(tv.cid), 0);

        // Step 3: Verify that after revocation, we can upload the same CID again
        vm.warp(block.timestamp + 1);
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        uint256 newUploadTime = willFactory.cidUploadedTimes(tv.cid);
        assertEq(newUploadTime, block.timestamp);
        assertTrue(newUploadTime > uploadTime);
    }

    function test_RevokeNortarizedCid_Integration() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid);

        // Verify notarization
        uint256 notarizeTime = willFactory.cidNotarizedTimes(tv.cid);
        assertTrue(notarizeTime > 0);

        // Step 3: Revoke the notarized CID
        vm.expectEmit(true, false, false, true);
        emit WillFactory.NotarizedCidRevoked(tv.cid, block.timestamp);

        vm.prank(notary);
        willFactory.revokeNortarizedCid(tv.cid);

        // Verify revocation - both times should be reset to 0
        assertEq(willFactory.cidUploadedTimes(tv.cid), 0);
        assertEq(willFactory.cidNotarizedTimes(tv.cid), 0);

        // Step 4: Verify that after revocation, we can upload and notarize the same CID again
        vm.warp(block.timestamp + 1);
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid);

        // Verify re-upload and re-notarization worked
        assertTrue(willFactory.cidUploadedTimes(tv.cid) > 0);
        assertTrue(willFactory.cidNotarizedTimes(tv.cid) > 0);
    }

    function test_RevokeWorkflow_CannotRevokeNotarizedWithUnnortarizedFunction() public {
        TestVector memory tv = testVectors[0];

        // Upload and notarize CID
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid);

        // Try to revoke notarized CID with revokeUnnortarizedCid - should fail
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, tv.cid));
        vm.prank(tv.testator);
        willFactory.revokeUnnortarizedCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.cid
        );
    }

    function _getTestDataFromEnv() internal view returns (
        address testator,
        address executor,
        Will.Estate[] memory estates,
        uint256 salt,
        string memory cid
    ) {
        // Read values from environment variables
        testator = vm.envAddress("TESTATOR");
        executor = vm.envAddress("EXECUTOR");

        estates = new Will.Estate[](maxEstates);
        estates[0] = Will.Estate({
            beneficiary: vm.envAddress("BENEFICIARY0"),
            token: vm.envAddress("TOKEN0"),
            amount: vm.envUint("AMOUNT0")
        });

        estates[1] = Will.Estate({
            beneficiary: vm.envAddress("BENEFICIARY1"),
            token: vm.envAddress("TOKEN1"),
            amount: vm.envUint("AMOUNT1")
        });

        salt = vm.envUint("SALT");
        cid = vm.envString("CID");
    }

    function _getEncryptedWillFromFile() public view returns (JsonCidVerifier.TypedJsonObject memory) {
        string memory encryptedJsonPath = "../apps/backend/will/6_encrypted.json";
        string memory encryptedJson = vm.readFile(encryptedJsonPath);

        JsonCidVerifier.TypedJsonObject memory willTypedJsonObj;
        willTypedJsonObj.keys = new string[](5);
        willTypedJsonObj.values = new JsonCidVerifier.JsonValue[](5);

        willTypedJsonObj.keys[0] = "algorithm";
        willTypedJsonObj.keys[1] = "iv";
        willTypedJsonObj.keys[2] = "authTag";
        willTypedJsonObj.keys[3] = "ciphertext";
        willTypedJsonObj.keys[4] = "timestamp";

        string memory algorithm = abi.decode(vm.parseJson(encryptedJson, ".algorithm"), (string));
        uint256[] memory iv = abi.decode(vm.parseJson(encryptedJson, ".iv"), (uint256[]));
        uint256[] memory authTag = abi.decode(vm.parseJson(encryptedJson, ".authTag"), (uint256[]));
        uint256[] memory ciphertext = abi.decode(vm.parseJson(encryptedJson, ".ciphertext"), (uint256[]));
        uint256 timestamp = abi.decode(vm.parseJson(encryptedJson, ".timestamp"), (uint256));

        willTypedJsonObj.values[0] = JsonCidVerifier.JsonValue(algorithm, new uint[](0), JsonCidVerifier.JsonValueType.STRING);
        willTypedJsonObj.values[1] = JsonCidVerifier.JsonValue("", iv, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[2] = JsonCidVerifier.JsonValue("", authTag, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[3] = JsonCidVerifier.JsonValue("", ciphertext, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[4] = JsonCidVerifier.JsonValue(vm.toString(timestamp), new uint[](0), JsonCidVerifier.JsonValueType.NUMBER);

        return willTypedJsonObj;
    }

    function _getCidUploadProofFromFiles() public view returns (CidUploadProofData memory) {
        string memory proofPath = "../zkp/circuits/cidUpload/proofs/proof.json";
        string memory publicPath = "../zkp/circuits/cidUpload/proofs/public.json";

        string memory proofJson = vm.readFile(proofPath);
        string memory publicJson = vm.readFile(publicPath);

        // Parse proof.json
        uint256[2] memory pA;
        uint256[2][2] memory pB;
        uint256[2] memory pC;

        string memory pA0Str = abi.decode(vm.parseJson(proofJson, ".pi_a[0]"), (string));
        string memory pA1Str = abi.decode(vm.parseJson(proofJson, ".pi_a[1]"), (string));
        pA[0] = vm.parseUint(pA0Str);
        pA[1] = vm.parseUint(pA1Str);

        // @note G2 point (pB) needs to swap the order
        pB[0][0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[0][1]"), (string)));
        pB[0][1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[0][0]"), (string)));
        pB[1][0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[1][1]"), (string)));
        pB[1][1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[1][0]"), (string)));

        pC[0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_c[0]"), (string)));
        pC[1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_c[1]"), (string)));

        // Parse public.json
        string[] memory pubStringArray = abi.decode(vm.parseJson(publicJson), (string[]));
        require(pubStringArray.length == 290, "Public signals array must have exactly 290 elements");

        uint256[290] memory pubSignals;
        for (uint256 i = 0; i < 290; i++) {
            pubSignals[i] = vm.parseUint(pubStringArray[i]);
        }

        return CidUploadProofData({ pA: pA, pB: pB, pC: pC, pubSignals: pubSignals });
    }

    function _getWillCreationProofFromFiles() public view returns (WillCreationProofData memory) {
        string memory proofPath = "../zkp/circuits/willCreation/proofs/proof.json";
        string memory publicPath = "../zkp/circuits/willCreation/proofs/public.json";

        string memory proofJson = vm.readFile(proofPath);
        string memory publicJson = vm.readFile(publicPath);

        // Parse proof.json
        uint256[2] memory pA;
        uint256[2][2] memory pB;
        uint256[2] memory pC;

        pA[0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_a[0]"), (string)));
        pA[1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_a[1]"), (string)));

        // @note G2 point (pB) needs to swap the order
        pB[0][0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[0][1]"), (string)));
        pB[0][1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[0][0]"), (string)));
        pB[1][0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[1][1]"), (string)));
        pB[1][1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[1][0]"), (string)));

        pC[0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_c[0]"), (string)));
        pC[1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_c[1]"), (string)));

        // Parse public.json
        string[] memory pubStringArray = abi.decode(vm.parseJson(publicJson), (string[]));
        require(pubStringArray.length == 300, "Public signals array must have exactly 300 elements");

        uint256[300] memory pubSignals;
        for (uint256 i = 0; i < 300; i++) {
            pubSignals[i] = vm.parseUint(pubStringArray[i]);
        }

        return WillCreationProofData({ pA: pA, pB: pB, pC: pC, pubSignals: pubSignals });
    }

    function _compareEstateArraysHash(Will.Estate[] memory estates0, Will.Estate[] memory estates1)
        public
        pure
        returns (bool)
    {
        return keccak256(abi.encode(estates0)) == keccak256(abi.encode(estates1));
    }
}
