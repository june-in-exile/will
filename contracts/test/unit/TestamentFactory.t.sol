// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/TestamentFactory.sol";
import "src/Testament.sol";
import "mock/MockContracts.sol";

contract TestamentFactoryUnitTest is Test {
    TestamentFactory public factory;
    MockGroth16Verifier public mockTestatorVerifier;
    MockGroth16Verifier public mockDecryptionVerifier;
    MockJSONCIDVerifier public mockJsonCidVerifier;

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

    // uint256[2] pA = [
    //     0x2c980756d6558991c65a5f82e7d0603b1608754ceac751620e56efd644135bb7,
    //     0x2f953155593e6d01a868eaa06b2a3db9f036f11ff8c760016419b996a053e896
    // ];
    // uint256[2][2] pB = [
    //     [
    //         0x1fe89bd3f35bd07ca20afa0637f056f9eed89c0f63ce4f65126c7e9b2e9a1e6a,
    //         0x28b174f1e98be9903c0ee927961eb05b9f60be50e996ee823717643d2255e513
    //     ],
    //     [
    //         0x1bea8ed545e7a99e1052b3de385a1bd0aa9d6379ce93fd2f45e82dc9d541dcf8,
    //         0x1f151808bfa97093f15ddabeda7528a2c3cccfd71212d11cbed9d0663ac2e6b4
    //     ]
    // ];
    // uint256[2] pC = [
    //     0x22e53c8de0c5058bfd4fd7358227965e1ea935d0e18d36bbcf49d4f4d320e21e,
    //     0x2dcb3d97482cf20509fc1c2b64a41ea29fb73825c7e70cf25bc0763b66377100
    // ];
    // uint256[1] pubSignals = [uint256(0x21)];

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

    uint256 public salt = 12345;

    string public cid = "QmTest123";
    string public testament = '{"beneficiaries": ["0x123"]}';

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
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);

        uint256 expectedTimestamp = block.timestamp;
        vm.expectEmit(false, false, false, false);
        emit TestamentFactory.CIDUploaded(cid, expectedTimestamp);

        factory.uploadCID(pA, pB, pC, pubSignals, testament, cid);

        vm.prank(executor);
        assertEq(factory.testatorValidateTimes(cid), block.timestamp);
    }

    function test_UploadCID_JSONCIDInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(false, "Invalid format");

        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.JSONCIDInvalid.selector,
                cid,
                "Invalid format"
            )
        );

        factory.uploadCID(pA, pB, pC, pubSignals, testament, cid);
    }

    function test_UploadCID_TestatorProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(false);

        vm.expectRevert(TestamentFactory.TestatorProofInvalid.selector);

        factory.uploadCID(pA, pB, pC, pubSignals, testament, cid);
    }

    function test_NotarizeCID_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testament, cid);

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
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testament, cid);

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
            testament,
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
            testament,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateTestament_CIDNotValidatedByExecutor() public {
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testament, cid);

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
            testament,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateTestament_DecryptionProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testament, cid);

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
            testament,
            cid,
            testator,
            estates,
            salt
        );
    }

    function test_CreateTestament_TestamentAlreadyExists() public {
        // Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        mockDecryptionVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, testament, cid);

        vm.warp(block.timestamp + 1);

        bytes memory executorSignature = _executorSign(cid);
        factory.notarizeCID(cid, executorSignature);

        // Create first testament
        address firstTestament = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            testament,
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
            testament,
            cid,
            testator,
            estates,
            salt + 1
        );
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
