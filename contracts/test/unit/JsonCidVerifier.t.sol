// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "src/JsonCidVerifier.sol";

contract JsonCidVerifierUnitTest is Test {
    JsonCidVerifier public verifier;

    // Test data
    JsonCidVerifier.JsonObject simpleJson;
    JsonCidVerifier.TypedJsonObject typedJson;

    // Generated from JavaScript implementation
    string expectedCidSimple;
    string expectedCidTyped;

    function setUp() public {
        verifier = new JsonCidVerifier();

        // Setup simple JSON: {"name":"Alice","age":"30","measurements":"[84,61,90]"}
        simpleJson.keys = new string[](3);
        simpleJson.values = new string[](3);
        simpleJson.keys[0] = "name";
        simpleJson.keys[1] = "age";
        simpleJson.keys[2] = "measurements";
        simpleJson.values[0] = "Alice";
        simpleJson.values[1] = "30";
        simpleJson.values[2] = "[84,61,90]";
        expectedCidSimple = "bagaaierayeldai4jgkbslacut6yde7sjbuqw4zwg755usm2fw5hs35che74q";

        // Setup typed JSON: {"name":"Alice","age":30,"measurements":[84,61,90]}
        typedJson.keys = new string[](3);
        typedJson.values = new JsonCidVerifier.JsonValue[](3);
        typedJson.keys[0] = "name";
        typedJson.keys[1] = "age";
        typedJson.keys[2] = "measurements";
        expectedCidTyped = "bagaaiera6cn3wl6afd25fjk7g2pfk4vkaolb3u7adzw4wfgi4r3m7cwarhbq";

        typedJson.values[0] = JsonCidVerifier.JsonValue("Alice", new uint256[](0),  JsonCidVerifier.JsonValueType.STRING);
        typedJson.values[1] = JsonCidVerifier.JsonValue("30", new uint256[](0), JsonCidVerifier.JsonValueType.NUMBER);
        uint256[] memory measurementsArr = new uint256[](3);
        measurementsArr[0] = 84;
        measurementsArr[1] = 61;
        measurementsArr[2] = 90;
        typedJson.values[2] = JsonCidVerifier.JsonValue("", measurementsArr, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
    }

    // =============================================================================
    // buildStandardizedJson
    // =============================================================================

    function test_buildStandardizedJson_SimpleObject() public view {
        string memory result = verifier.buildStandardizedJson(simpleJson);
        assertEq(result, '{"name":"Alice","age":"30","measurements":"[84,61,90]"}');
    }

    function test_buildStandardizedJson_SingleKeyValue() public view {
        JsonCidVerifier.JsonObject memory singleJson;
        singleJson.keys = new string[](1);
        singleJson.values = new string[](1);
        singleJson.keys[0] = "test";
        singleJson.values[0] = "value";

        string memory result = verifier.buildStandardizedJson(singleJson);
        assertEq(result, '{"test":"value"}');
    }

    function test_buildStandardizedJson_EmptyValues() public view {
        JsonCidVerifier.JsonObject memory emptyValueJson;
        emptyValueJson.keys = new string[](2);
        emptyValueJson.values = new string[](2);
        emptyValueJson.keys[0] = "empty";
        emptyValueJson.keys[1] = "null";
        emptyValueJson.values[0] = "";
        emptyValueJson.values[1] = "";

        string memory result = verifier.buildStandardizedJson(emptyValueJson);
        assertEq(result, '{"empty":"","null":""}');
    }

    function test_buildStandardizedJson_RevertOnLengthMismatch() public {
        JsonCidVerifier.JsonObject memory mismatchJson;
        mismatchJson.keys = new string[](2);
        mismatchJson.values = new string[](1);
        mismatchJson.keys[0] = "key1";
        mismatchJson.keys[1] = "key2";
        mismatchJson.values[0] = "value1";

        vm.expectRevert(abi.encodeWithSelector(JsonCidVerifier.LengthMismatch.selector, 2, 1));
        verifier.buildStandardizedJson(mismatchJson);
    }

    function test_buildStandardizedJson_RevertOnEmptyObject() public {
        JsonCidVerifier.JsonObject memory emptyJson;
        emptyJson.keys = new string[](0);
        emptyJson.values = new string[](0);

        vm.expectRevert(JsonCidVerifier.EmptyJSONObject.selector);
        verifier.buildStandardizedJson(emptyJson);
    }

    // =============================================================================
    // buildStandardizedJsonTyped
    // =============================================================================

    function test_buildStandardizedJsonTyped_AllTypes() public view {
        string memory result = verifier.buildStandardizedJson(typedJson);
        assertEq(result, '{"name":"Alice","age":30,"measurements":[84,61,90]}');
    }

    function test_buildStandardizedJsonTyped_StringOnly() public view {
        JsonCidVerifier.TypedJsonObject memory stringOnlyJson;
        stringOnlyJson.keys = new string[](1);
        stringOnlyJson.values = new JsonCidVerifier.JsonValue[](1);
        stringOnlyJson.keys[0] = "text";
        stringOnlyJson.values[0] = JsonCidVerifier.JsonValue("hello", new uint256[](0), JsonCidVerifier.JsonValueType.STRING);

        string memory result = verifier.buildStandardizedJson(stringOnlyJson);
        assertEq(result, '{"text":"hello"}');
    }

    function test_buildStandardizedJsonTyped_NumberOnly() public view {
        JsonCidVerifier.TypedJsonObject memory numberOnlyJson;
        numberOnlyJson.keys = new string[](1);
        numberOnlyJson.values = new JsonCidVerifier.JsonValue[](1);
        numberOnlyJson.keys[0] = "count";
        numberOnlyJson.values[0] = JsonCidVerifier.JsonValue("42", new uint256[](0), JsonCidVerifier.JsonValueType.NUMBER);

        string memory result = verifier.buildStandardizedJson(numberOnlyJson);
        assertEq(result, '{"count":42}');
    }

    function test_buildStandardizedJsonTyped_NumberArrayOnly() public view {
        JsonCidVerifier.TypedJsonObject memory numberOnlyJson;
        numberOnlyJson.keys = new string[](1);
        numberOnlyJson.values = new JsonCidVerifier.JsonValue[](1);
        numberOnlyJson.keys[0] = "counts";
        uint256[] memory countsArr = new uint256[](5);
        for (uint8 i = 0; i < 5; i++) {
            countsArr[i] = i + 1;
        }
        numberOnlyJson.values[0] = JsonCidVerifier.JsonValue("", countsArr, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);

        string memory result = verifier.buildStandardizedJson(numberOnlyJson);
        assertEq(result, '{"counts":[1,2,3,4,5]}');
    }

    // =============================================================================
    // Utility Functions
    // =============================================================================

    function test_getMultihash() public view {
        bytes memory jsonBytes = bytes('{"test":"value"}');
        bytes memory multihash = verifier.getMultihash(jsonBytes);

        // Check multihash format: [0x12][0x20][32 bytes hash]
        assertEq(multihash.length, 34);
        assertEq(uint8(multihash[0]), 0x12); // SHA-256 identifier
        assertEq(uint8(multihash[1]), 0x20); // 32 bytes length

        // Verify the hash is actually SHA-256 of input
        bytes32 expectedHash = sha256(jsonBytes);
        for (uint256 i = 0; i < 32; i++) {
            assertEq(uint8(multihash[2 + i]), uint8(expectedHash[i]));
        }
    }

    function test_getCidBytes() public view {
        bytes memory multihash = hex"12201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        bytes memory cidBytes = verifier.getCidBytes(multihash);

        // Check CID format: [0x01][0x80][0x04][multihash]
        assertEq(cidBytes.length, 37);
        assertEq(uint8(cidBytes[0]), 0x01); // CIDv1
        assertEq(uint8(cidBytes[1]), 0x80); // JSON codec first byte
        assertEq(uint8(cidBytes[2]), 0x04); // JSON codec second byte

        // Verify multihash is correctly copied
        for (uint256 i = 0; i < 34; i++) {
            assertEq(uint8(cidBytes[3 + i]), uint8(multihash[i]));
        }
    }

    function test_getCidString_ValidInput() public view {
        // Valid CID bytes: CIDv1 + JSON codec + SHA-256 multihash
        bytes memory validCidBytes = hex"01800412201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

        string memory result = verifier.getCidString(validCidBytes);

        // Should start with 'b' (base32 multibase prefix)
        bytes memory resultBytes = bytes(result);
        assertEq(resultBytes[0], "b");
        assertGt(resultBytes.length, 1);
    }

    function test_getCidString_RevertOnInvalidLength() public {
        bytes memory invalidCidBytes = hex"0180041220"; // Too short

        vm.expectRevert("Invalid CID bytes length for json codec");
        verifier.getCidString(invalidCidBytes);
    }

    function test_getCidString_RevertOnInvalidVersion() public {
        bytes memory invalidCidBytes = hex"00800412201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

        vm.expectRevert("Not CIDv1");
        verifier.getCidString(invalidCidBytes);
    }

    function test_getCidString_RevertOnInvalidCodec() public {
        bytes memory invalidCidBytes = hex"01700412201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

        vm.expectRevert("Not Varint-encoded json codec (first byte)");
        verifier.getCidString(invalidCidBytes);
    }

    function test_stringEquals() public view {
        assertTrue(verifier.stringEquals("hello", "hello"));
        assertFalse(verifier.stringEquals("hello", "world"));
        assertTrue(verifier.stringEquals("", ""));
        assertFalse(verifier.stringEquals("test", ""));
    }

    // =============================================================================
    // Integration Functions
    // =============================================================================

    function test_generateCidString_SimpleObject() public view {
        string memory cid = verifier.generateCidString(simpleJson);

        bytes memory cidBytes = bytes(cid);
        assertEq(cidBytes[0], "b");
        assertGt(cidBytes.length, 50);

        assertEq(cid, expectedCidSimple, "The CID is different from expected");
    }

    function test_generateCidStringTyped_TypedObject() public view {
        string memory cid = verifier.generateCidString(typedJson);

        bytes memory cidBytes = bytes(cid);
        assertEq(cidBytes[0], "b");
        assertGt(cidBytes.length, 50);

        assertEq(cid, expectedCidTyped, "The CID is different from expected");
    }

    function test_verifyCid_ValidPair() public view {
        string memory cid = verifier.generateCidString(simpleJson);
        assertTrue(verifier.verifyCid(simpleJson, cid));
    }

    function test_verifyCid_InvalidPair() public view {
        string memory cid = verifier.generateCidString(simpleJson);

        // Create different JSON object
        JsonCidVerifier.JsonObject memory differentJson;
        differentJson.keys = new string[](1);
        differentJson.values = new string[](1);
        differentJson.keys[0] = "different";
        differentJson.values[0] = "value";

        assertFalse(verifier.verifyCid(differentJson, cid));
    }

    function test_verifyCidTyped_ValidPair() public view {
        string memory cid = verifier.generateCidString(typedJson);
        assertTrue(verifier.verifyCid(typedJson, cid));
    }

    function test_verifyCidTyped_InvalidPair() public view {
        string memory cid = verifier.generateCidString(typedJson);

        // Create different typed JSON object
        JsonCidVerifier.TypedJsonObject memory differentJson;
        differentJson.keys = new string[](1);
        differentJson.values = new JsonCidVerifier.JsonValue[](1);
        differentJson.keys[0] = "different";
        differentJson.values[0] = JsonCidVerifier.JsonValue("value", new uint256[](0), JsonCidVerifier.JsonValueType.STRING);

        assertFalse(verifier.verifyCid(differentJson, cid));
    }

    // =============================================================================
    // Consistency
    // =============================================================================

    function test_consistency_SameInputSameCid() public view {
        string memory cid1 = verifier.generateCidString(simpleJson);
        string memory cid2 = verifier.generateCidString(simpleJson);
        assertEq(cid1, cid2);
    }

    function test_consistency_DifferentInputDifferentCid() public view {
        JsonCidVerifier.JsonObject memory differentJson;
        differentJson.keys = new string[](1);
        differentJson.values = new string[](1);
        differentJson.keys[0] = "different";
        differentJson.values[0] = "data";

        string memory cid1 = verifier.generateCidString(simpleJson);
        string memory cid2 = verifier.generateCidString(differentJson);

        assertFalse(verifier.stringEquals(cid1, cid2));
    }
}
