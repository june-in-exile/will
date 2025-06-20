// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/TestamentFactory.sol";
import "src/Testament.sol";
import "src/Groth16Verifier.sol";
import "src/JSONCIDVerifier.sol";

contract TestamentFactoryIntegrationTest is Test {
    TestamentFactory testamentFactory;
    Groth16Verifier testatorVerifier;
    Groth16Verifier decryptionVerifier;
    JSONCIDVerifier jsonCidVerifier;

    address executor;
    address permit2;

    // Known test vectors (generate with your JavaScript implementation and your wallet)
    struct TestVector {
        string name;
        address testator;
        Testament.Estate[] estates;
        uint256 salt;
        JSONCIDVerifier.JsonObject testamentJsonObj;
        string cid;
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[1] pubSignals;
        bytes executorSignature;
    }

    TestVector[] testVectors;

    function setUp() public {
        testatorVerifier = new Groth16Verifier();
        decryptionVerifier = new Groth16Verifier();
        jsonCidVerifier = new JSONCIDVerifier();

        executor = 0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a;
        permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

        testamentFactory = new TestamentFactory(
            address(testatorVerifier),
            address(decryptionVerifier),
            address(jsonCidVerifier),
            executor,
            permit2
        );

        _setupTestVectors();
    }

    function _setupTestVectors() internal {
        {
            JSONCIDVerifier.JsonObject memory testamentJsonObj;
            testamentJsonObj.keys = new string[](5);
            testamentJsonObj.values = new string[](5);
            testamentJsonObj.keys[0] = "algorithm";
            testamentJsonObj.keys[1] = "iv";
            testamentJsonObj.keys[2] = "authTag";
            testamentJsonObj.keys[3] = "ciphertext";
            testamentJsonObj.keys[4] = "timestamp";
            testamentJsonObj.values[0] = "aes-256-gcm";
            testamentJsonObj.values[1] = "SXwGj4zpnPz6fJvo";
            testamentJsonObj.values[2] = "tp0VPERBYMhUac8HyQwfFA==";
            testamentJsonObj.values[
                    3
                ] = "47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==";
            testamentJsonObj.values[4] = "2025-06-17T18:34:55.262Z";

            Testament.Estate[] memory estates = new Testament.Estate[](2);

            estates[0] = Testament.Estate({
                beneficiary: address(
                    0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c
                ),
                token: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d, // Arbitrum Sepolia USDC
                amount: 1000 // USDC has 6 decimals
            });

            estates[1] = Testament.Estate({
                beneficiary: address(
                    0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c
                ),
                token: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E, // Arbitrum Sepolia LINK
                amount: 5000000 // LINK has 18 decimals
            });

            testVectors.push(
                TestVector({
                    name: "20250618 Testament",
                    testator: address(
                        0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc
                    ),
                    estates: estates,
                    salt: 864777079914391,
                    testamentJsonObj: testamentJsonObj,
                    cid: "bagaaieraxixnqlxvscc7b4v6d5gpl3wwig6okfftz62xtle32tdzlewerepa",
                    pA: [
                        0x08c35f7c434ba8c5426398ee0420200f6910a696e983a11efaa2b5adc2195a89,
                        0x2abca425c205c5b339704b29647e3f0c6390eb99b39924bea5ba4406e0922c6a
                    ],
                    pB: [
                        [
                            0x12438cf74314362aa727c0692dbaacc015ca3f3583685a675e1aead05a31ac12,
                            0x232bccbcea951659a241d7315a665c5e727fdc69640916b6a2a9acd40bf645df
                        ],
                        [
                            0x0d8273b8ef1cbb0b97d1ff38393a33c108125e7187c49cd511607dd480a21bc4,
                            0x28ed665e8fb00c8b9418b4558fff68081e3419c06440d41a0c862a198bd132ee
                        ]
                    ],
                    pC: [
                        0x2ebb18910748a41d31ae22f72b323b572b1bc7ba15b98da1b8c71d22ca4e3305,
                        0x1e6b5a7c74e12838f5d89087be76e4e1793603ba373138867a24446484f0fdfc
                    ],
                    pubSignals: [uint256(0x21)],
                    executorSignature: hex"f3bb9d0e0d2923ee57cd1d5a34e00ba6412a6f217ef763d31b4fd7452f71370950fa181b4e49142f9302c29a8731a59c99a8eb8b76fd01b74f704299888721d21c"
                })
            );
        }
    }

    function test_FullWorkflow_UploadNotarizeCreate() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.expectEmit(true, true, false, true);
        emit TestamentFactory.CIDUploaded(tv.cid, block.timestamp);

        testamentFactory.uploadCID(
            tv.pA,
            tv.pB,
            tv.pC,
            tv.pubSignals,
            tv.testamentJsonObj,
            tv.cid
        );

        // Verify upload
        vm.prank(executor);
        uint256 uploadTime = testamentFactory.testatorValidateTimes(tv.cid);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);

        vm.expectEmit(true, false, false, true);
        emit TestamentFactory.CIDNotarized(tv.cid, block.timestamp);

        testamentFactory.notarizeCID(tv.cid, tv.executorSignature);

        // Verify notarization
        vm.prank(executor);
        uint256 notarizeTime = testamentFactory.executorValidateTimes(tv.cid);
        assertEq(notarizeTime, block.timestamp);
        assertTrue(notarizeTime > uploadTime);

        // Step 3: Create Testament
        address predictedAddress = testamentFactory.predictTestament(
            tv.testator,
            tv.estates,
            tv.salt
        );

        vm.expectEmit(true, true, false, true);
        emit TestamentFactory.TestamentCreated(
            tv.cid,
            tv.testator,
            predictedAddress
        );

        address testamentAddress = testamentFactory.createTestament(
            tv.pA,
            tv.pB,
            tv.pC,
            tv.pubSignals,
            tv.testamentJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        // Verify testament creation
        assertEq(testamentFactory.testaments(tv.cid), testamentAddress);
        assertEq(testamentAddress, predictedAddress);

        // Verify testament contract exists and has correct properties
        Testament testament = Testament(testamentAddress);
        assertEq(address(testament.permit2()), permit2);
        assertEq(testament.testator(), tv.testator);
        assertEq(testament.executor(), executor);
        assertFalse(testament.executed());

        assertTrue(
            _compareEstateArraysHash(testament.getAllEstates(), tv.estates)
        );
    }

    function test_WorkflowWithTimingConstraints() public {
        TestVector memory tv = testVectors[0];

        // Upload at time T
        uint256 startTime = block.timestamp;
        testamentFactory.uploadCID(
            tv.pA,
            tv.pB,
            tv.pC,
            tv.pubSignals,
            tv.testamentJsonObj,
            tv.cid
        );

        // Try to create testament without notarization - should fail
        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.CIDNotValidatedByExecutor.selector,
                tv.cid
            )
        );
        testamentFactory.createTestament(
            tv.pA,
            tv.pB,
            tv.pC,
            tv.pubSignals,
            tv.testamentJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        // Notarize at time T (same as upload) - should fail creation
        testamentFactory.notarizeCID(tv.cid, tv.executorSignature);

        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.CIDNotValidatedByExecutor.selector,
                tv.cid
            )
        );
        testamentFactory.createTestament(
            tv.pA,
            tv.pB,
            tv.pC,
            tv.pubSignals,
            tv.testamentJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        // Fast forward time and re-notarize - should succeed
        vm.warp(startTime + 100);
        testamentFactory.notarizeCID(tv.cid, tv.executorSignature);

        address testamentAddress = testamentFactory.createTestament(
            tv.pA,
            tv.pB,
            tv.pC,
            tv.pubSignals,
            tv.testamentJsonObj,
            tv.cid,
            tv.testator,
            tv.estates,
            tv.salt
        );

        assertEq(testamentFactory.testaments(tv.cid), testamentAddress);
    }

    function _compareEstateArraysHash(
        Testament.Estate[] memory estates0,
        Testament.Estate[] memory estates1
    ) public pure returns (bool) {
        return
            keccak256(abi.encode(estates0)) == keccak256(abi.encode(estates1));
    }
}
