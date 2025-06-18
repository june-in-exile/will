// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/TestamentFactory.sol";
import "src/Testament.sol";
import "src/Groth16Verifier.sol";
import "src/JSONCIDVerifier.sol";

contract TestamentFactoryIntegrationTest is Test {
    TestamentFactory public factory;
    Groth16Verifier public testatorVerifier;
    Groth16Verifier public decryptionVerifier;
    JSONCIDVerifier public jsonCidVerifier;

    // address public constant PERMIT2 =
    //     address(0x000000000022D473030F116dDEE9F6B43aC78BA3);
    // address public constant EXECUTOR =
    //     address(0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a);
    // address public constant TESTATOR =
    //     address(0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc);

    // address public constant BENEFICIARY0 =
    //     address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
    // address public constant TOEKN0 =
    //     address(0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d); // USDC on Arbitrum Sepolia
    // uint256 public constant AMOUNT0 = 1000; // USDC has 6 decimals

    // address public constant BENEFICIARY1 =
    //     address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
    // address public constant TOEKN1 =
    //     address(0xb1D4538B4571d411F07960EF2838Ce337FE1E80E); // LINK on Arbitrum Sepolia
    // uint256 public constant AMOUNT1 = 5000000; // LINK has 18 decimals

    // uint256 public constant SALT = 601172341903255;

    // string constant TESTAMENT =
    //     '{"algorithm": "aes-256-gcm","iv": "QfUql56zQD1WDVxk","authTag": "mW2eC+FZmBykA8OaL/dHew==","ciphertext": "Jp6YtOUjJMfbGiZ9+c3/gUjJaDdQ7SDJfmLKLY+xnaEZKown+9/Sx2zmSNONvLtudSKzRIf8nFTT9WY0dQe40RqqKflhNm6nzpE7P+l5MFvFC5WBI2Zj1xgzq8mMdyonnuKd/yPE837fHab1BkNjomM6SZI6cKD6C8UNpps8hx9IwdyQI9J5gtIN2lMzUL7Kpa2tO3+N+cnKthLGTJegyaJ44Mx6Z6tp3WihGR3KJNo9VDLAlPamLDnsEd7CQLOVHllbez42r3Ass51szBsEFHrduuRL+JBf+//TZp/bRvpdmXTXipfQgZJspaEmtfWCiqAgQfdY0NgfrM78aziJlTkAPWe6WgvwD9ioLXcs/2f/nz7mZ7K1k831956n4DyM8lMhRX8/iMTSoOPsmS+sqTNBt2CuHfLQln4/jmf7OWgNPIEhfk/KHUKs9ILdg+pZREI1JYf9z8/2DDd/TDjP8+BPQyRWI2mirD6UnBvN9JSq+UN4jmVQJqARcK/PXPNX8qYibgy2g2sf6v9A9+yF62mJ1w6u/FMxISX2PDxJOaEGCo+JgEsUFQntt5MWGkCkFbdVLmygPd9r/6U0sa+KyWjSLI9FrLZ3Qk6/UAe5hKD0KpsO37M1dbuYSi7DxNsPCfNXuJe6cvtKXFeM3q5fVlCiE9Fqna4z+WkQoPOZ4VYuSSmfs0lXIYZ42kYgZJxoZO4FeLZ/4obNRSLWZ/4inq/WopjPKJXJXIsmtMv7Sv8PTOcNUQ1/gniK/BbUHrFojbqKV0JlncBOwJ8agd6hhw8F8A/82nShQicGKldphgouyeVDnpDegX/EOtemt38/rQksln+LHwUnC0p+YbRktTsW+OK+DI3B+oqLqyTjhfVOnXfm6M7a+CEtW8MZk9KcPwVihWZ4EAQAezkZtYTvhfXPXSGJe02rifb8cEiyGNrA4X2CBzp/iJ/kfyx7DxaTpeWE2xXje85M1Z+jDdPXoLw8dFtvWW9G8Fizi5fsoaiBieTvhZ2hpnX9U6uP3SLeNaqsccHINwY4FLgBPXepP4hQn+UDmALZrTdj6UCDexldYF4KEuOUVqhsUF6rs9wSJoUfCCJSGYZSP00DK40Q1PtlMF3nYVCgiNtGUd0pfLncyl5nGMAHRAupBtxBixyo1Xuk7YePR9+0KHaRatVuDl2RJC87UQjUQgNTmUXPayzWW5501cFfq5mt94bIo5uVSJb7fLmbMDDzdWUNxn0TFU7z8M7OgvdrGWXzXw==","timestamp": "2025-06-17T11:15:34.681Z"}';
    // string constant CID =
    //     "bagaaieravitxwfvvw3wbkyl4mndf72oyx3kygmowhqggm47txasow7bqblia";
    // bytes constant EXECUTOR_SIGNATURE =
    //     hex"ea12050d60f5ca4abbc5dac04ef5ef261d3ea906cdd2aff7d9db065e1e29271b636f12c8e9c27d5121f9e02acf7a48051d1bb4077df0770709e49139d0244e9f1b";

    address executor;
    uint256 executorPrivateKey;
    address permit2 = address(0x000000000022D473030F116dDEE9F6B43aC78BA3);
    address testator = address(0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc);

    address beneficiary0 = address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
    address token0 = address(0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d); // USDC on Arbitrum Sepolia
    uint256 amount0 = 1000; // USDC has 6 decimals

    address beneficiary1 = address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
    address token1 = address(0xb1D4538B4571d411F07960EF2838Ce337FE1E80E); // LINK on Arbitrum Sepolia
    uint256 amount1 = 5000000; // LINK has 18 decimals

    uint256 salt = 864777079914391;

    JSONCIDVerifier.JsonObject testamentJson;
    string cid =
        "bagaaieraxixnqlxvscc7b4v6d5gpl3wwig6okfftz62xtle32tdzlewerepa";

    uint256[2] pA = [
        0x2c980756d6558991c65a5f82e7d0603b1608754ceac751620e56efd644135bb7,
        0x2f953155593e6d01a868eaa06b2a3db9f036f11ff8c760016419b996a053e896
    ];
    uint256[2][2] pB = [
        [
            0x1fe89bd3f35bd07ca20afa0637f056f9eed89c0f63ce4f65126c7e9b2e9a1e6a,
            0x28b174f1e98be9903c0ee927961eb05b9f60be50e996ee823717643d2255e513
        ],
        [
            0x1bea8ed545e7a99e1052b3de385a1bd0aa9d6379ce93fd2f45e82dc9d541dcf8,
            0x1f151808bfa97093f15ddabeda7528a2c3cccfd71212d11cbed9d0663ac2e6b4
        ]
    ];
    uint256[2] pC = [
        0x22e53c8de0c5058bfd4fd7358227965e1ea935d0e18d36bbcf49d4f4d320e21e,
        0x2dcb3d97482cf20509fc1c2b64a41ea29fb73825c7e70cf25bc0763b66377100
    ];
    uint256[1] pubSignals = [uint256(0x21)];

    Testament.Estate[] estates;

    function setUp() public {
        executorPrivateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        executor = vm.addr(executorPrivateKey);

        testatorVerifier = new Groth16Verifier();
        decryptionVerifier = new Groth16Verifier();
        jsonCidVerifier = new JSONCIDVerifier();

        factory = new TestamentFactory(
            address(testatorVerifier),
            address(decryptionVerifier),
            address(jsonCidVerifier),
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

        string[] memory keys = new string[](5);
        keys[0] = "algorithm";
        keys[1] = "iv";
        keys[2] = "authTag";
        keys[3] = "ciphertext";
        keys[4] = "saltimestampt";

        string[] memory values = new string[](5);
        values[0] = "aes-256-gcm";
        values[1] = "SXwGj4zpnPz6fJvo";
        values[2] = "tp0VPERBYMhUac8HyQwfFA==";
        values[
            3
        ] = "47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==";
        values[4] = "2025-06-17T18:34:55.262Z";

        testamentJson = JSONCIDVerifier.JsonObject({
            keys: keys,
            values: values
        });
    }

    // function test_FullWorkflow_UploadNotarizeCreate() public {
    //     // Step 1: Upload CID
    //     vm.expectEmit(true, true, false, true);
    //     emit TestamentFactory.CIDUploaded(cid, block.timestamp);

    //     factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

    //     // Verify upload
    //     vm.prank(executor);
    //     uint256 uploadTime = factory.testatorValidateTimes(cid);
    //     assertEq(uploadTime, block.timestamp);

    //     // Step 2: Notarize CID
    //     vm.warp(block.timestamp + 1);
    //     bytes memory signature = _executorSign(cid);

    //     vm.expectEmit(true, false, false, true);
    //     emit TestamentFactory.CIDNotarized(cid, block.timestamp);

    //     factory.notarizeCID(cid, signature);

    //     // Verify notarization
    //     vm.prank(executor);
    //     uint256 notarizeTime = factory.executorValidateTimes(cid);
    //     assertEq(notarizeTime, block.timestamp);
    //     assertTrue(notarizeTime > uploadTime);

    //     // Step 3: Create Testament
    //     address predictedAddress = factory.predictTestament(
    //         testator,
    //         estates,
    //         salt
    //     );

    //     vm.expectEmit(true, true, false, true);
    //     emit TestamentFactory.TestamentCreated(cid, testator, predictedAddress);

    //     address testamentAddress = factory.createTestament(
    //         pA,
    //         pB,
    //         pC,
    //         pubSignals,
    //         testamentJson,
    //         cid,
    //         testator,
    //         estates,
    //         salt
    //     );

    //     // Verify testament creation
    //     assertEq(factory.testaments(cid), testamentAddress);
    //     assertEq(testamentAddress, predictedAddress);

    //     // Verify testament contract exists and has correct properties
    //     Testament testamentContract = Testament(testamentAddress);
    //     assertEq(address(testamentContract.permit2()), permit2);
    //     assertEq(testamentContract.testator(), testator);
    //     assertEq(testamentContract.executor(), executor);
    //     assertFalse(testamentContract.executed());

    //     (
    //         address testamentBeneficiary0,
    //         address testamentToken0,
    //         uint256 testamentAmount0
    //     ) = testamentContract.estates(0);
    //     assertEq(testamentBeneficiary0, beneficiary0);
    //     assertEq(testamentToken0, token0);
    //     assertEq(testamentAmount0, amount0);

    //     (
    //         address testamentBeneficiary1,
    //         address testamentToken1,
    //         uint256 testamentAmount1
    //     ) = testamentContract.estates(1);
    //     assertEq(testamentBeneficiary1, beneficiary1);
    //     assertEq(testamentToken1, token1);
    //     assertEq(testamentAmount1, amount1);
    // }

    function test_WorkflowWithTimingConstraints() public {
        // Upload at time T
        // uint256 startTime = block.timestamp;
        // factory.uploadCID(pA, pB, pC, pubSignals, testamentJson, cid);

        // Try to create testament without notarization - should fail
        // vm.expectRevert(
        //     abi.encodeWithSelector(
        //         TestamentFactory.CIDNotValidatedByExecutor.selector,
        //         cid
        //     )
        // );
        // factory.createTestament(
        //     pA,
        //     pB,
        //     pC,
        //     pubSignals,
        //     testamentJson,
        //     cid,
        //     testator,
        //     estates,
        //     salt
        // );

        // // Notarize at time T (same as upload) - should fail creation
        // bytes memory signature = _executorSign(cid);
        // factory.notarizeCID(cid, signature);

        // vm.expectRevert(
        //     abi.encodeWithSelector(
        //         TestamentFactory.CIDNotValidatedByExecutor.selector,
        //         cid
        //     )
        // );
        // factory.createTestament(
        //     pA,
        //     pB,
        //     pC,
        //     pubSignals,
        //     testamentJson,
        //     cid,
        //     testator,
        //     estates,
        //     salt
        // );

        // // Fast forward time and re-notarize - should succeed
        // vm.warp(startTime + 100);
        // factory.notarizeCID(cid, signature);

        // address testamentAddress = factory.createTestament(
        //     pA,
        //     pB,
        //     pC,
        //     pubSignals,
        //     testamentJson,
        //     cid,
        //     testator,
        //     estates,
        //     salt
        // );

        // assertEq(factory.testaments(cid), testamentAddress);
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
