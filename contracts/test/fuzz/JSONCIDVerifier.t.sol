// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "src/JsonCidVerifier.sol";

contract JsonCidVerifierFuzzTest is Test {
    JsonCidVerifier verifier;

    function setUp() public {
        verifier = new JsonCidVerifier();
    }

    // =============================================================================
    // buildStandardizedJson
    // =============================================================================

    function test_buildStandardizedJson_ValidInputs(
        uint256 lengthSeed,
        uint256 keySeed,
        uint256 valueSeed
    ) public view {
        // Bound the arrays to reasonable sizes (1-5 elements)
        uint256 arrayLength = bound(lengthSeed, 1, 5);

        string[] memory keys = new string[](arrayLength);
        string[] memory values = new string[](arrayLength);

        // Filter out empty keys to avoid invalid JSON
        for (uint256 i = 0; i < arrayLength; i++) {
            uint256 keyNum = bound(
                uint256(keccak256(abi.encode(keySeed, i))),
                0,
                999
            );
            uint256 valueNum = bound(
                uint256(keccak256(abi.encode(valueSeed, i))),
                0,
                999
            );

            keys[i] = string.concat("key", vm.toString(keyNum));
            values[i] = string.concat("value", vm.toString(valueNum));
        }

        JsonCidVerifier.JsonObject memory jsonObj = JsonCidVerifier.JsonObject({
            keys: keys,
            values: values
        });

        string memory result = verifier.buildStandardizedJson(jsonObj);

        // Basic format checks
        bytes memory resultBytes = bytes(result);
        assertEq(resultBytes[0], "{");
        assertEq(resultBytes[resultBytes.length - 1], "}");

        // Should contain all keys
        for (uint256 i = 0; i < keys.length; i++) {
            assertTrue(_stringContains(result, keys[i]));
            assertTrue(_stringContains(result, values[i]));
        }
    }

    function test_buildStandardizedJson_MismatchedLengths(
        uint256 keyLengthSeed,
        uint256 valueLengthSeed
    ) public {
        uint256 keyLength = bound(keyLengthSeed, 1, 10);
        uint256 valueLength = bound(valueLengthSeed, 1, 10);

        if (keyLength == valueLength) {
            valueLength = keyLength + 1;
        }

        string[] memory keys = new string[](keyLength);
        string[] memory values = new string[](valueLength);

        // Generate keys
        for (uint256 i = 0; i < keyLength; i++) {
            keys[i] = string.concat("key", vm.toString(i));
        }
        // Generate values
        for (uint256 i = 0; i < valueLength; i++) {
            values[i] = string.concat("value", vm.toString(i));
        }

        JsonCidVerifier.JsonObject memory jsonObj = JsonCidVerifier.JsonObject({
            keys: keys,
            values: values
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                JsonCidVerifier.LengthMismatch.selector,
                keys.length,
                values.length
            )
        );
        verifier.buildStandardizedJson(jsonObj);
    }

    // =============================================================================
    // buildStandardizedJsonTyped
    // =============================================================================

    function test_buildStandardizedJsonTyped_ValidInputs(
        uint256 lengthSeed,
        uint256 keySeed,
        uint256 valueSeed,
        uint256 typeSeed
    ) public view {
        uint256 arrayLength = bound(lengthSeed, 1, 3);

        string[] memory keys = new string[](arrayLength);
        JsonCidVerifier.JsonValue[]
            memory typedValues = new JsonCidVerifier.JsonValue[](arrayLength);

        for (uint256 i = 0; i < arrayLength; i++) {
            // Generate keys
            uint256 keyNum = bound(
                uint256(keccak256(abi.encode(keySeed, i))),
                0,
                999
            );
            keys[i] = string.concat("key", vm.toString(keyNum));

            // Generate values and types
            uint256 valueNum = bound(
                uint256(keccak256(abi.encode(valueSeed, i))),
                0,
                999
            );
            uint8 valueType = uint8(
                bound(uint256(keccak256(abi.encode(typeSeed, i))), 0, 3)
            );

            string memory value;
            if (valueType == 0) {
                // STRING
                value = string.concat("str", vm.toString(valueNum));
            } else if (valueType == 1) {
                // NUMBER
                value = vm.toString(valueNum);
            } else if (valueType == 2) {
                // BOOLEAN
                value = (valueNum % 2 == 0) ? "true" : "false";
            } else {
                // NULL
                value = "";
            }

            typedValues[i] = JsonCidVerifier.JsonValue({
                value: value,
                valueType: JsonCidVerifier.JsonValueType(valueType)
            });
        }

        JsonCidVerifier.TypedJsonObject memory jsonObj = JsonCidVerifier
            .TypedJsonObject({keys: keys, values: typedValues});

        string memory result = verifier.buildStandardizedJson(jsonObj);

        // Basic format checks
        bytes memory resultBytes = bytes(result);
        assertEq(resultBytes[0], "{");
        assertEq(resultBytes[resultBytes.length - 1], "}");

        // Should contain all keys
        for (uint256 i = 0; i < keys.length; i++) {
            assertTrue(_stringContains(result, keys[i]));
        }
    }

    // =============================================================================
    // CID Generation
    // =============================================================================

    function test_generateCIDString_Consistency(
        uint256 lengthSeed,
        uint256 keySeed,
        uint256 valueSeed
    ) public view {
        uint256 arrayLength = bound(lengthSeed, 1, 3);

        string[] memory keys = new string[](arrayLength);
        string[] memory values = new string[](arrayLength);

        for (uint256 i = 0; i < arrayLength; i++) {
            uint256 keyNum = bound(
                uint256(keccak256(abi.encode(keySeed, i))),
                0,
                999
            );
            uint256 valueNum = bound(
                uint256(keccak256(abi.encode(valueSeed, i))),
                0,
                999
            );

            keys[i] = string.concat("key", vm.toString(keyNum));
            values[i] = string.concat("value", vm.toString(valueNum));
        }

        JsonCidVerifier.JsonObject memory jsonObj = JsonCidVerifier.JsonObject({
            keys: keys,
            values: values
        });

        // Generate CID multiple times - should be consistent
        string memory cid1 = verifier.generateCIDString(jsonObj);
        string memory cid2 = verifier.generateCIDString(jsonObj);

        assertTrue(verifier.stringEquals(cid1, cid2));

        // CID should start with 'b' (base32 multibase prefix)
        bytes memory cidBytes = bytes(cid1);
        assertEq(cidBytes[0], "b");
        assertGt(cidBytes.length, 50); // Reasonable CID length
    }

    function test_verifyCID_SelfConsistency(
        uint256 lengthSeed,
        uint256 keySeed,
        uint256 valueSeed
    ) public view {
        uint256 arrayLength = bound(lengthSeed, 1, 3);

        string[] memory keys = new string[](arrayLength);
        string[] memory values = new string[](arrayLength);

        for (uint256 i = 0; i < arrayLength; i++) {
            uint256 keyNum = bound(
                uint256(keccak256(abi.encode(keySeed, i))),
                0,
                999
            );
            uint256 valueNum = bound(
                uint256(keccak256(abi.encode(valueSeed, i))),
                0,
                999
            );

            keys[i] = string.concat("key", vm.toString(keyNum));
            values[i] = string.concat("value", vm.toString(valueNum));
        }

        JsonCidVerifier.JsonObject memory jsonObj = JsonCidVerifier.JsonObject({
            keys: keys,
            values: values
        });

        // Generated CID should verify against the same JSON
        string memory cid = verifier.generateCIDString(jsonObj);
        assertTrue(verifier.verifyCID(jsonObj, cid));
    }

    // =============================================================================
    // Utility Functions
    // =============================================================================

    function test_getJsonBytes(string memory input) public view {
        bytes memory result = verifier.getJsonBytes(input);
        assertEq(result, bytes(input));
    }

    function test_getMultihash(bytes memory input) public view {
        vm.assume(input.length <= 1000); // Reasonable size limit

        bytes memory multihash = verifier.getMultihash(input);

        // Check format
        assertEq(multihash.length, 34);
        assertEq(uint8(multihash[0]), 0x12); // SHA-256
        assertEq(uint8(multihash[1]), 0x20); // 32 bytes

        // Verify hash correctness
        bytes32 expectedHash = sha256(input);
        for (uint256 i = 0; i < 32; i++) {
            assertEq(uint8(multihash[2 + i]), uint8(expectedHash[i]));
        }
    }

    function test_getCIDBytes(bytes32 hashValue) public view {
        // Create valid multihash
        bytes memory multihash = new bytes(34);
        multihash[0] = 0x12; // SHA-256
        multihash[1] = 0x20; // 32 bytes
        for (uint256 i = 0; i < 32; i++) {
            multihash[2 + i] = hashValue[i];
        }

        bytes memory cidBytes = verifier.getCIDBytes(multihash);

        // Check CID format
        assertEq(cidBytes.length, 37);
        assertEq(uint8(cidBytes[0]), 0x01); // CIDv1
        assertEq(uint8(cidBytes[1]), 0x80); // JSON codec
        assertEq(uint8(cidBytes[2]), 0x04); // JSON codec

        // Verify multihash is preserved
        for (uint256 i = 0; i < 34; i++) {
            assertEq(uint8(cidBytes[3 + i]), uint8(multihash[i]));
        }
    }

    function test_stringEquals(string memory a, string memory b) public view {
        bool result = verifier.stringEquals(a, b);
        bool expected = keccak256(bytes(a)) == keccak256(bytes(b));
        assertEq(result, expected);
    }

    // =============================================================================
    // Edge Cases
    // =============================================================================

    function test_largeInputHandling(uint8 arraySize) public view {
        arraySize = uint8(bound(arraySize, 1, 20)); // 1-20 elements

        string[] memory keys = new string[](arraySize);
        string[] memory values = new string[](arraySize);

        for (uint256 i = 0; i < arraySize; i++) {
            keys[i] = string.concat("key", vm.toString(i));
            values[i] = string.concat("value", vm.toString(i));
        }

        JsonCidVerifier.JsonObject memory jsonObj = JsonCidVerifier.JsonObject({
            keys: keys,
            values: values
        });

        // Should handle larger inputs without reverting
        string memory cid = verifier.generateCIDString(jsonObj);
        assertTrue(verifier.verifyCID(jsonObj, cid));

        bytes memory cidBytes = bytes(cid);
        assertEq(cidBytes[0], "b");
        assertGt(cidBytes.length, 50);
    }

    function test_specialCharacterHandling(bytes1 specialChar) public view {
        // Test with various special characters (but avoid ones that break JSON)
        vm.assume(specialChar != 0x22); // Not quote
        vm.assume(specialChar != 0x5C); // Not backslash
        vm.assume(specialChar != 0x00); // Not null
        vm.assume(specialChar >= 0x20 && specialChar <= 0x7E); // Printable ASCII

        string[] memory keys = new string[](1);
        string[] memory values = new string[](1);

        keys[0] = "test";
        values[0] = string(abi.encodePacked(specialChar));

        JsonCidVerifier.JsonObject memory jsonObj = JsonCidVerifier.JsonObject({
            keys: keys,
            values: values
        });

        string memory cid = verifier.generateCIDString(jsonObj);

        assertTrue(verifier.verifyCID(jsonObj, cid));
    }

    // =============================================================================
    // HELPER FUNCTIONS
    // =============================================================================

    function _containsInvalidChars(
        string memory str
    ) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        for (uint256 i = 0; i < strBytes.length; i++) {
            bytes1 char = strBytes[i];
            // Check for characters that would break JSON format
            if (char == 0x22 || char == 0x5C || char == 0x00) {
                // quote, backslash, null
                return true;
            }
            // Check for control characters
            if (uint8(char) < 0x20) {
                return true;
            }
        }
        return false;
    }

    function _stringContains(
        string memory str,
        string memory substr
    ) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory substrBytes = bytes(substr);

        if (substrBytes.length == 0) return true;
        if (strBytes.length < substrBytes.length) return false;

        for (uint256 i = 0; i <= strBytes.length - substrBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < substrBytes.length; j++) {
                if (strBytes[i + j] != substrBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }
}
