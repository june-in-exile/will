// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "src/CidUploadVerifier.sol";
import "src/WillCreationVerifier.sol";
import "src/JsonCidVerifier.sol";

contract WillFactoryIntegrationTest is Test {
    WillFactory willFactory;
    CidUploadVerifier cidUploadVerifier;
    WillCreationVerifier willCreateVerifier;
    JsonCidVerifier jsonCidVerifier;

    address notary;
    address executor;
    address permit2;

    struct CidUploadProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[286] pubSignals;
    }

    struct WillCreationProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[292] pubSignals;
    }

    // Known test vectors (generate with your JavaScript implementation and your wallet)
    struct TestVector {
        string name;
        address testator;
        Will.Estate[] estates;
        uint256 salt;
        JsonCidVerifier.TypedJsonObject willTypedJsonObj;
        string cid;
        CidUploadProofData cidUploadProof;
        bytes notarySignature;
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

        notary = 0xc052e703B3e22987c4e9AbA03549D7C3236bE5d3;
        executor = 0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a;
        permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

        willFactory = new WillFactory(
            address(cidUploadVerifier), address(willCreateVerifier), address(jsonCidVerifier), notary, executor, permit2
        );

        _setupTestVectors();
    }

    function _setupTestVectors() internal {
        {
            JsonCidVerifier.TypedJsonObject memory willTypedJsonObj;
            willTypedJsonObj.keys = new string[](5);
            willTypedJsonObj.values = new JsonCidVerifier.JsonValue[](5);
            willTypedJsonObj.keys[0] = "algorithm";
            willTypedJsonObj.keys[1] = "iv";
            willTypedJsonObj.keys[2] = "authTag";
            willTypedJsonObj.keys[3] = "ciphertext";
            willTypedJsonObj.keys[4] = "timestamp";
            willTypedJsonObj.values[0] = JsonCidVerifier.JsonValue("aes-256-ctr", JsonCidVerifier.JsonValueType(0));
            willTypedJsonObj.values[1] = JsonCidVerifier.JsonValue("CLmM4F7Y3P53nEXYbwUxdw==", JsonCidVerifier.JsonValueType(0));
            willTypedJsonObj.values[2] =
                JsonCidVerifier.JsonValue("", JsonCidVerifier.JsonValueType(0));
            willTypedJsonObj.values[3] = JsonCidVerifier.JsonValue(
                "WHiJloqVh+sLSneyEWbLGLQkCTWGVi1x9X8yegF0ZLM6vqkwX7Q9T/iDz8SdFtA0eqPp2YvNJSLwHg2MRG4yq09RSINXv1A9y12G7/DxJAOaD9F+mvR6L6pC5SM0kYvswIyVC+flHM6FsKXGG0/eYwLhryVWPj3Julm26BLen2vE+L2qWrUZK7to8zuvKGwU/miGLdhOHchdYIBXLAtRV5K+cjB15OvJyZ75t853fE2Jnm/bqP5cVupLC4eDU9BQlL/nKM0DMff6Noo5x0Njg4y5V6GwahDNxNhiDyoVFHl3fXKU4zkDsa634Av2KyokB7OyxOzt3wg98j7io4FiLQAaa4E8Otw5HWg2t78=",
                JsonCidVerifier.JsonValueType(0)
            );
            willTypedJsonObj.values[4] = JsonCidVerifier.JsonValue("1758740919", JsonCidVerifier.JsonValueType(1));

            Will.Estate[] memory estates = new Will.Estate[](2);

            estates[0] = Will.Estate({
                beneficiary: address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c),
                token: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d, // Arbitrum Sepolia USDC
                amount: 1000 // USDC has 6 decimals
             });

            estates[1] = Will.Estate({
                beneficiary: address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c),
                token: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E, // Arbitrum Sepolia LINK
                amount: 5000000 // LINK has 18 decimals
             });

            CidUploadProofData memory cidUploadProof = _getCidUploadProofFromEnvArrays();
            WillCreationProofData memory willCreationProof = _getWillCreationProofFromEnvArrays();

            testVectors.push(
                TestVector({
                    name: "20250925 Will",
                    testator: address(0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc),
                    estates: estates,
                    salt: 50975579764360880106236920062598993488283553682642442441465735635811502740393,
                    willTypedJsonObj: willTypedJsonObj,
                    cid: "bagaaieragn2kj6lh3zew2jthnxvdwvjtvdtbnbycwlp43fc5fe2izdu66bwa",
                    cidUploadProof: cidUploadProof,
                    notarySignature: hex"ff83a0645588e5e2ffc9a6aa0766d1160747a2b7ce1bcbaf32f75741cda159b153c0ad960cdd68cbbb3587b6877f591562ce37a829d6b853031dfbe180d491991b",
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
        vm.prank(executor);
        uint256 uploadTime = willFactory.cidUploadedTimes(tv.cid);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidNotarized(tv.cid, block.timestamp);

        vm.prank(executor);
        willFactory.notarizeCid(tv.cid, tv.notarySignature);

        // Verify notarization
        vm.prank(executor);
        uint256 notarizeTime = willFactory.cidNotarizedTimes(tv.cid);
        assertEq(notarizeTime, block.timestamp);
        assertTrue(notarizeTime > uploadTime);

        // Step 3: Create Will
        address predictedAddress = willFactory.predictWill(tv.testator, tv.estates, tv.salt);

        vm.expectEmit(true, true, false, true);
        emit WillFactory.WillCreated(tv.cid, tv.testator, predictedAddress);

        vm.prank(executor);
        address willAddress = willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        // Verify will creation
        assertEq(willFactory.wills(tv.cid), willAddress);
        assertEq(willAddress, predictedAddress);

        // Verify will contract exists and has correct properties
        Will will = Will(willAddress);
        assertEq(address(will.permit2()), permit2);
        assertEq(will.testator(), tv.testator);
        assertEq(will.executor(), executor);
        assertFalse(will.executed());

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
        vm.prank(executor);
        willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        // Notarize at time T (same as upload) - should fail
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, tv.cid));
        vm.prank(executor);
        willFactory.notarizeCid(tv.cid, tv.notarySignature);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, tv.cid));
        vm.prank(executor);
        willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        // Fast forward time and notarize - should success
        vm.warp(startTime + 1);
        vm.prank(executor);
        willFactory.notarizeCid(tv.cid, tv.notarySignature);

        // Fast forward time and re-notarize - should fail
        vm.warp(startTime + 1);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, tv.cid));
        vm.prank(executor);
        willFactory.notarizeCid(tv.cid, tv.notarySignature);

        // Create Will with "notarization time > upload time" - should success
        vm.prank(executor);
        address willAddress = willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        assertEq(willFactory.wills(tv.cid), willAddress);
    }

    function _getCidUploadProofFromEnvArrays() public view returns (CidUploadProofData memory) {
        uint256[] memory paArray = vm.envUint("CID_UPLOAD_PA_ARRAY", ",");
        require(paArray.length == 2, "CID_UPLOAD_PA_ARRAY must have exactly 2 elements");

        uint256[] memory pbArray = vm.envUint("CID_UPLOAD_PB_ARRAY", ",");
        require(pbArray.length == 4, "CID_UPLOAD_PB_ARRAY must have exactly 4 elements");

        uint256[] memory pcArray = vm.envUint("CID_UPLOAD_PC_ARRAY", ",");
        require(pcArray.length == 2, "CID_UPLOAD_PC_ARRAY must have exactly 2 elements");

        uint256[] memory pubArray = vm.envUint("CID_UPLOAD_PUBSIGNALS_ARRAY", ",");
        require(pubArray.length == 286, "CID_UPLOAD_PUBSIGNALS_ARRAY must have exactly 286 elements");

        uint256[2] memory pA = [paArray[0], paArray[1]];

        uint256[2][2] memory pB = [
            [pbArray[0], pbArray[1]], // First pair
            [pbArray[2], pbArray[3]] // Second pair
        ];

        uint256[2] memory pC = [pcArray[0], pcArray[1]];

        uint256[286] memory pubSignals;
        for (uint256 i = 0; i < 286; i++) {
            pubSignals[i] = pubArray[i];
        }

        return CidUploadProofData({ pA: pA, pB: pB, pC: pC, pubSignals: pubSignals });
    }

    function _getWillCreationProofFromEnvArrays() public view returns (WillCreationProofData memory) {
        uint256[] memory paArray = vm.envUint("WILL_CREATION_PA_ARRAY", ",");
        require(paArray.length == 2, "WILL_CREATION_PA_ARRAY must have exactly 2 elements");

        uint256[] memory pbArray = vm.envUint("WILL_CREATION_PB_ARRAY", ",");
        require(pbArray.length == 4, "WILL_CREATION_PB_ARRAY must have exactly 4 elements");

        uint256[] memory pcArray = vm.envUint("WILL_CREATION_PC_ARRAY", ",");
        require(pcArray.length == 2, "WILL_CREATION_PC_ARRAY must have exactly 2 elements");

        uint256[] memory pubArray = vm.envUint("WILL_CREATION_PUBSIGNALS_ARRAY", ",");
        require(pubArray.length == 292, "WILL_CREATION_PUBSIGNALS_ARRAY must have exactly 292 elements");

        uint256[2] memory pA = [paArray[0], paArray[1]];

        uint256[2][2] memory pB = [
            [pbArray[0], pbArray[1]], // First pair
            [pbArray[2], pbArray[3]] // Second pair
        ];

        uint256[2] memory pC = [pcArray[0], pcArray[1]];

        uint256[292] memory pubSignals;
        for (uint256 i = 0; i < 292; i++) {
            pubSignals[i] = pubArray[i];
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
