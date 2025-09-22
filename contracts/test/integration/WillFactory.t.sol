// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "src/Groth16Verifier.sol";
import "src/JsonCidVerifier.sol";

contract WillFactoryIntegrationTest is Test {
    WillFactory willFactory;
    Groth16Verifier cidUploadVerifier;
    Groth16Verifier willCreateVerifier;
    JsonCidVerifier jsonCidVerifier;

    address executor;
    address permit2;

    struct ProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[1] pubSignals;
    }

    // Known test vectors (generate with your JavaScript implementation and your wallet)
    struct TestVector {
        string name;
        address testator;
        Will.Estate[] estates;
        uint256 salt;
        JsonCidVerifier.TypedJsonObject willTypedJsonObj;
        string cid;
        ProofData proof;
        bytes executorSignature;
    }

    TestVector[] testVectors;

    function setUp() public {
        cidUploadVerifier = new Groth16Verifier();
        willCreateVerifier = new Groth16Verifier();
        jsonCidVerifier = new JsonCidVerifier();

        executor = 0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a;
        permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

        willFactory = new WillFactory(
            address(cidUploadVerifier),
            address(willCreateVerifier),
            address(jsonCidVerifier),
            executor,
            permit2
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
            willTypedJsonObj.values[0] = JsonCidVerifier.JsonValue("aes-256-gcm", JsonCidVerifier.JsonValueType(0));
            willTypedJsonObj.values[1] = JsonCidVerifier.JsonValue("b6Ybk5mYz0p+7CkZ", JsonCidVerifier.JsonValueType(0));
            willTypedJsonObj.values[2] = JsonCidVerifier.JsonValue("/28t2nOpVOKNk/XQYkf47A==", JsonCidVerifier.JsonValueType(0));
            willTypedJsonObj.values[
                    3
                ] = JsonCidVerifier.JsonValue("SZkfuZ69jkYe7O5ErjyM7OvPbaB/y486aCb7O48dM9MjHAfHDG6ZlGZUN7BIrTFbbfktPwPi2GMDkabKVXZDc3MUfwoDo3DYUsUzgorblbLh5vAmYaY7P9rr7D4t/WDUxsg7HCKiPLF32gbC9QJ1u1WAJpv3sWSh43iaTxAkBKH6gWD1K6smihBrLCGR4Iy7DV5+o3d0jlVulsc+g2wmc1yRW3c7HTXV/BO56mU/NC3z7eH4x8M/4j3H6CzCZ99StjSts9er1VvtMgzZuO989j435lGmtDsy48/gONuz8JKXsyO5QuNcUIoGZ5YsuCzAok2EfvBr/fqrbEphEotMs2B7x5v/NNt2Xb4YQu1bTUbEb5hMaMCNGrkCQVd2Fb9ITK9fe9vsfIhmf3pN/4aQY8MyHSUNtw5JtDT32F2DmC48A4L1NUtIgSyvJpJW/o3rURRF+vAYvlzXkyeVUHfpYoWcQEY9WnlGfIQ9hT6RVJ4ibgpc3hCMcOOHfyR5Y2n+guJyfsvsygTCjktGJOR5IoySJdWpK58riw3ZGJNlpQxgn7i9vEEQpODTO28yTMUH8jv5P8/QT4YVBBbnDBN8aca3zA7MMuOJEcoF4ihoZASs5l4Ifgbd0k31AT1rJN+HpgBy/cdAGpJLmlllz1CJLjtg25SH+3TeplaXuoBzb7rFslCGcP3nMhyS4nmxP94zpz4K5Vg90agbmFod3PEfdoBgC7T1t/2S0SwZ7zwosO9Ddi9pvAgtSX0Uv9L+knACLrHdPk034lXJJ5H97tO6i5U7S1XjGn2gtzPB6WwhV1fFU20=", JsonCidVerifier.JsonValueType(0));
            willTypedJsonObj.values[4] = JsonCidVerifier.JsonValue("1753839518", JsonCidVerifier.JsonValueType(1));

            Will.Estate[] memory estates = new Will.Estate[](2);

            estates[0] = Will.Estate({
                beneficiary: address(
                    0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c
                ),
                token: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d, // Arbitrum Sepolia USDC
                amount: 1000 // USDC has 6 decimals
            });

            estates[1] = Will.Estate({
                beneficiary: address(
                    0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c
                ),
                token: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E, // Arbitrum Sepolia LINK
                amount: 5000000 // LINK has 18 decimals
            });

            ProofData memory proof = _getProofDataFromEnvArrays();

            testVectors.push(
                TestVector({
                    name: "20250730 Will",
                    testator: address(
                        0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc
                    ),
                    estates: estates,
                    salt: 1378220706920347,
                    willTypedJsonObj: willTypedJsonObj,
                    cid: "bagaaieraefc2woszrhvcuqmfrnayst7coljauh6rfhcyx3o7pkxg2o3k2yza",
                    proof: proof,
                    executorSignature: hex"43c146572dc9a4b648659717ae95cedd8ee0f8c93f5b4828d27ea9cb416b90d20ecb5f5f53602b443074295c298979ab3bb6a9c1dd9e9e645371fc914d169e721c"
                })
            );
        }
    }

    function test_FullWorkflow_UploadNotarizeCreate() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.expectEmit(true, true, false, true);
        emit WillFactory.CIDUploaded(tv.cid, block.timestamp);

        willFactory.uploadCid(
            tv.proof.pA,
            tv.proof.pB,
            tv.proof.pC,
            tv.proof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Verify upload
        vm.prank(executor);
        uint256 uploadTime = willFactory.testatorValidateTimes(tv.cid);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CIDNotarized(tv.cid, block.timestamp);

        willFactory.notarizeCid(tv.cid, tv.executorSignature);

        // Verify notarization
        vm.prank(executor);
        uint256 notarizeTime = willFactory.executorValidateTimes(tv.cid);
        assertEq(notarizeTime, block.timestamp);
        assertTrue(notarizeTime > uploadTime);

        // Step 3: Create Will
        address predictedAddress = willFactory.predictWill(
            tv.testator,
            tv.estates,
            tv.salt
        );

        vm.expectEmit(true, true, false, true);
        emit WillFactory.WillCreated(tv.cid, tv.testator, predictedAddress);

        address willAddress = willFactory.createWill(
            tv.proof.pA,
            tv.proof.pB,
            tv.proof.pC,
            tv.proof.pubSignals,
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
        willFactory.uploadCid(
            tv.proof.pA,
            tv.proof.pB,
            tv.proof.pC,
            tv.proof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Try to create will without notarization - should fail
        vm.expectRevert(
            abi.encodeWithSelector(
                WillFactory.CIDNotValidatedByExecutor.selector,
                tv.cid
            )
        );
        willFactory.createWill(
            tv.proof.pA,
            tv.proof.pB,
            tv.proof.pC,
            tv.proof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        // Notarize at time T (same as upload) - should fail creation
        willFactory.notarizeCid(tv.cid, tv.executorSignature);

        vm.expectRevert(
            abi.encodeWithSelector(
                WillFactory.CIDNotValidatedByExecutor.selector,
                tv.cid
            )
        );
        willFactory.createWill(
            tv.proof.pA,
            tv.proof.pB,
            tv.proof.pC,
            tv.proof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        // Fast forward time and re-notarize - should succeed
        vm.warp(startTime + 100);
        willFactory.notarizeCid(tv.cid, tv.executorSignature);

        address willAddress = willFactory.createWill(
            tv.proof.pA,
            tv.proof.pB,
            tv.proof.pC,
            tv.proof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        assertEq(willFactory.wills(tv.cid), willAddress);
    }

    function _getProofDataFromEnvArrays()
        public
        view
        returns (ProofData memory)
    {
        uint256[] memory paArray = vm.envUint("PA_ARRAY", ",");
        require(paArray.length == 2, "PA_ARRAY must have exactly 2 elements");

        uint256[] memory pbArray = vm.envUint("PB_ARRAY", ",");
        require(pbArray.length == 4, "PB_ARRAY must have exactly 4 elements");

        uint256[] memory pcArray = vm.envUint("PC_ARRAY", ",");
        require(pcArray.length == 2, "PC_ARRAY must have exactly 2 elements");

        uint256[] memory pubArray = vm.envUint("PUBSIGNALS_ARRAY", ",");
        require(
            pubArray.length == 1,
            "PUBSIGNALS_ARRAY must have exactly 1 element"
        );

        uint256[2] memory pA = [paArray[0], paArray[1]];

        uint256[2][2] memory pB = [
            [pbArray[0], pbArray[1]], // First pair
            [pbArray[2], pbArray[3]] // Second pair
        ];

        uint256[2] memory pC = [pcArray[0], pcArray[1]];

        uint256[1] memory pubSignals = [pubArray[0]];

        return ProofData({pA: pA, pB: pB, pC: pC, pubSignals: pubSignals});
    }

    function _compareEstateArraysHash(
        Will.Estate[] memory estates0,
        Will.Estate[] memory estates1
    ) public pure returns (bool) {
        return
            keccak256(abi.encode(estates0)) == keccak256(abi.encode(estates1));
    }
}
