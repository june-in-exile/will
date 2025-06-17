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

contract TestamentFactoryUnitTest is Test {
    TestamentFactory public factory;
    MockGroth16Verifier public mockTestatorVerifier;
    MockGroth16Verifier public mockDecryptionVerifier;
    MockJSONCIDVerifier public mockJsonCidVerifier;

    address public constant PERMIT2 =
        address(0x000000000022D473030F116dDEE9F6B43aC78BA3);
    address public constant TESTAMENT_FACTORY_ADDRESS =
        address(0x148b32ABF9E57B8C6585E7EFdB5113f542f3fB4d);
    address public constant EXECUTOR =
        address(0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a);
    address public constant TESTATOR =
        address(0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc);

    address public constant BENEFICIARY0 =
        address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
    address public constant TOEKN0 =
        address(0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d); // USDC on Arbitrum Sepolia
    uint256 public constant AMOUNT0 = 1000; // USDC has 6 decimals

    address public constant BENEFICIARY1 =
        address(0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c);
    address public constant TOEKN1 =
        address(0xb1D4538B4571d411F07960EF2838Ce337FE1E80E); // LINK on Arbitrum Sepolia
    uint256 public constant AMOUNT1 = 5000000; // LINK has 18 decimals

    uint256 public constant SALT = 8907834245420950;

    string constant TESTAMENT =
        '{"algorithm": "aes-256-gcm","iv": "9jESTqILJek00GDq","authTag": "drpeTcbsxic9s2quNm/Lng==","ciphertext": "yRZRY6ZR78ugBRwdSkpbwjL0z/q0ib8Aizedrb1QmzJVaI1bLqlgPmY4j6t7Ds1Yvp2IBz+R2Whe4IZNWnGA/RvvUZJQ510MMU5hmJLtFrMmTYEmOQXP+Bpa5IORKu+k2zB95UPEK+hkOHo+LOT1TEtu/AH/X5EbNXTzuHxx3VUmh7lb8Gf4w4kPK+9FD5mbVxDqKm9jF+QvjhTpQavmFXOAZtXubFDOYd4JvG7JFdtVVcUh0B3RiUXNJV80B4/3IG2mDJLCCzNvr9KrgIuJOEXNCKeKwjIc7Spjsw67YcyjkYzs1oHP0UgUpMBbmY6WFpGjFMdbZHGzi//yuA/QYxiHPnQvrHFsgDbhG6zDqG4smT5bLAj9RkPN+J0mq7sIwSfs7VwQaZvHR9IwiZfxoV63Pkam8m+uCSRW/6MOb3oYgYolNtgM/VrOBmpi/69/drX4aaZRnJMHxkuisBPLGOfGQxciz4QkN1kvVXJgtaKjBuzjsiADX3Ln2tAgZ1Z+Lh4yhyBJALb1MPHmhJM0bfREEf/G9ZYRILNcjEF6+pyDsXpSac1r/vSK0GOJDa1zOtsYWB9dNAFpVY8oOs6/gyEko5GoqDh5FOcPkJu+twWPlCp8rsqN2FrMAm75D9WlfGqQzJUDn80XvuJ/gCUAz29GADxyu3H3COGJHHsKkCHEvP45xfcsNttIUS5Fq1ObonoKG+L2wTNX9C36H6uRLw/KGgfHATgOYzfNS5I2vfEHqeSDntL5Rwj7Nqur+GoC7AaJUfqZesMVs5JxWNGTQjcJB8yVYknuz+aOBwybr2Wl6tmTSejWr+6c3qE+Zc37Y2j/gM/sUkxO7x2Wi0p74c5Fsf2zxtK/qmWXrju9OXdOHmX/0jZYytoVJjR7QLHjAV8/EQ1c2tUEaqJdL4rpOUIBBDak4oA2zdetHBOriO1c2JHXV48Wf+fh9WP+8ikn8EAFzKBR/2T7PcveFtjJQWIm5Qqeg4/LIhKv4XlMwr+gsTel1oBdAPy0Bi21OM90XV1RkL6Kntq7oyE4GM1BRRubIXDfQ1MAJdCf5/7Tvjwpn97KYJy88unNGv78DnwIMSZGMHXOD+3jag5oYxc6keuJytN1WR7I+/Z/k7YXfkpmRmn3kgig71/NpOdsAndWri9a6U+pDW1FItlaLIqbQjKUHlOh5f59+/2YQqZm4ncJlqXRLPSkuGYXvCCaQt3plADspFGUFWpAlbSZh8jk3XzqINkQjZiNEo+4Tbg=","timestamp": "2025-06-16T15:48:00.913Z"}';
    string constant CID =
        "bagaaiera2ee2cotcjsuxep6ligx74qklmv4bg6s6aizvl5xqaytfvvtcoucq";
    bytes constant EXECUTOR_SIGNATURE =
        hex"7ec7765b9d7295b544cba9e082ecc456cc16766c9010dfcd881c7e51754a501c2916481dfd3867a721e76795f859b6dabb6c69c9ec21bdd2c6115e13a01fc5731b";

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

    Testament.Estate[] public estates;

    function setUp() public {
        mockTestatorVerifier = new MockGroth16Verifier();
        mockDecryptionVerifier = new MockGroth16Verifier();
        mockJsonCidVerifier = new MockJSONCIDVerifier();

        factory = new TestamentFactory(
            address(mockTestatorVerifier),
            address(mockDecryptionVerifier),
            address(mockJsonCidVerifier),
            EXECUTOR,
            PERMIT2
        );

        estates.push(
            Testament.Estate({
                beneficiary: BENEFICIARY0,
                token: TOEKN0,
                amount: AMOUNT0
            })
        );

        estates.push(
            Testament.Estate({
                beneficiary: BENEFICIARY1,
                token: TOEKN1,
                amount: AMOUNT1
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
        assertEq(factory.executor(), EXECUTOR);
        assertEq(factory.permit2(), PERMIT2);
    }

    function test_UploadCID_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);

        uint256 expectedTimestamp = block.timestamp;
        vm.expectEmit(false, false, false, false);
        emit TestamentFactory.CIDUploaded(CID, expectedTimestamp);

        factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);

        vm.prank(EXECUTOR);
        assertEq(factory.testatorValidateTimes(CID), block.timestamp);
    }

    function test_UploadCID_JSONCIDInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(false, "Invalid format");

        vm.expectRevert(
            abi.encodeWithSelector(
                TestamentFactory.JSONCIDInvalid.selector,
                CID,
                "Invalid format"
            )
        );

        factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);
    }

    function test_UploadCID_TestatorProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(false);

        vm.expectRevert(TestamentFactory.TestatorProofInvalid.selector);

        factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);
    }

    function test_NotarizeCID_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);

        vm.expectEmit(true, false, false, true);
        emit TestamentFactory.CIDNotarized(CID, block.timestamp);

        factory.notarizeCID(CID, EXECUTOR_SIGNATURE);
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
                CID
            )
        );

        factory.notarizeCID(CID, signature);
    }

    function test_CreateTestament_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true, "");
        mockTestatorVerifier.setShouldReturnTrue(true);
        factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);

        vm.warp(block.timestamp + 1);
        factory.notarizeCID(CID, EXECUTOR_SIGNATURE);

        mockDecryptionVerifier.setShouldReturnTrue(true);

        address predictedAddress = factory.predictTestament(
            TESTATOR,
            estates,
            SALT
        );

        // vm.expectEmit(true, true, false, true);
        // emit TestamentFactory.TestamentCreated(CID, TESTATOR, predictedAddress);

        address testamentAddress = factory.createTestament(
            pA,
            pB,
            pC,
            pubSignals,
            TESTAMENT,
            CID,
            TESTATOR,
            estates,
            SALT
        );

        assertEq(factory.testaments(CID), testamentAddress);
        assertEq(testamentAddress, predictedAddress);
    }

    // function test_CreateTestament_CIDNotValidatedByTestator() public {
    //     uint256 salt = 12345;

    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             TestamentFactory.CIDNotValidatedByTestator.selector,
    //             CID
    //         )
    //     );

    //     factory.createTestament(
    //         pA,
    //         pB,
    //         pC,
    //         pubSignals,
    //         TESTAMENT,
    //         CID,
    //         TESTATOR,
    //         estates,
    //         salt
    //     );
    // }

    // function test_CreateTestament_CIDNotValidatedByExecutor() public {
    //     uint256 salt = 12345;

    //     // Upload CID but don't notarize
    //     mockJsonCidVerifier.setShouldReturnTrue(true, "");
    //     mockTestatorVerifier.setShouldReturnTrue(true);
    //     factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);

    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             TestamentFactory.CIDNotValidatedByExecutor.selector,
    //             CID
    //         )
    //     );

    //     factory.createTestament(
    //         pA,
    //         pB,
    //         pC,
    //         pubSignals,
    //         TESTAMENT,
    //         CID,
    //         TESTATOR,
    //         estates,
    //         salt
    //     );
    // }

    // function test_CreateTestament_DecryptionProofInvalid() public {
    //     uint256 salt = 12345;

    //     // Upload and notarize CID
    //     mockJsonCidVerifier.setShouldReturnTrue(true, "");
    //     mockTestatorVerifier.setShouldReturnTrue(true);
    //     factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);

    //     vm.warp(block.timestamp + 1);
    //     bytes memory signature = _createValidSignature(CID);
    //     factory.notarizeCID(CID, signature);

    //     // Set decryption verifier to fail
    //     mockDecryptionVerifier.setShouldReturnTrue(false);

    //     vm.expectRevert(TestamentFactory.DecryptionProofInvalid.selector);

    //     factory.createTestament(
    //         pA,
    //         pB,
    //         pC,
    //         pubSignals,
    //         TESTAMENT,
    //         CID,
    //         TESTATOR,
    //         estates,
    //         salt
    //     );
    // }

    // function test_CreateTestament_TestamentAlreadyExists() public {
    //     uint256 salt = 12345;

    //     // Upload and notarize CID
    //     mockJsonCidVerifier.setShouldReturnTrue(true, "");
    //     mockTestatorVerifier.setShouldReturnTrue(true);
    //     mockDecryptionVerifier.setShouldReturnTrue(true);
    //     factory.uploadCID(pA, pB, pC, pubSignals, TESTAMENT, CID);

    //     vm.warp(block.timestamp + 1);
    //     bytes memory signature = _createValidSignature(CID);
    //     factory.notarizeCID(CID, signature);

    //     // Create first testament
    //     address firstTestament = factory.createTestament(
    //         pA,
    //         pB,
    //         pC,
    //         pubSignals,
    //         TESTAMENT,
    //         CID,
    //         TESTATOR,
    //         estates,
    //         salt
    //     );

    //     // Try to create second testament with same CID
    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             TestamentFactory.TestamentAlreadyExists.selector,
    //             CID,
    //             firstTestament
    //         )
    //     );

    //     factory.createTestament(
    //         pA,
    //         pB,
    //         pC,
    //         pubSignals,
    //         TESTAMENT,
    //         CID,
    //         TESTATOR,
    //         estates,
    //         salt + 1
    //     );
    // }

    // function _createValidSignature(
    //     string memory message
    // ) internal pure returns (bytes memory) {
    //     bytes32 messageHash = keccak256(abi.encodePacked(message));
    //     bytes32 ethSignedMessageHash = keccak256(
    //         abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
    //     );
    //     (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, ethSignedMessageHash);
    //     return abi.encodePacked(r, s, v);
    // }
}
