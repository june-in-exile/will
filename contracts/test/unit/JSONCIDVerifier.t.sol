// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "src/JSONCIDVerifier.sol";

contract JSONCIDVerifierUnitTest is Test {
    JSONCIDVerifier public verifier;

    // Test data
    JSONCIDVerifier.JsonObject simpleJson;
    JSONCIDVerifier.TypedJsonObject typedJson;

    // Generated from JavaScript implementation
    string expectedCIDSimple;
    string expectedCIDTyped;

    function setUp() public {
        verifier = new JSONCIDVerifier();

        // Setup simple JSON: {"name":"Alice","age":"30"}
        simpleJson.keys = new string[](2);
        simpleJson.values = new string[](2);
        simpleJson.keys[0] = "name";
        simpleJson.keys[1] = "age";
        simpleJson.values[0] = "Alice";
        simpleJson.values[1] = "30";
        expectedCIDSimple = "bagaaiera6ngbuvxsgagyxdm57ezcxhaejaouxn3f4maackcasdhquv4dt56a";

        // Setup typed JSON: {"name":"Alice","age":30,"active":true,"data":null}
        typedJson.keys = new string[](4);
        typedJson.values = new JSONCIDVerifier.JsonValue[](4);
        typedJson.keys[0] = "name";
        typedJson.keys[1] = "age";
        typedJson.keys[2] = "active";
        typedJson.keys[3] = "data";
        expectedCIDTyped = "bagaaierahuwddmix3id4x7qhonchbuyofmsbiij46stacr6uia7gz5keaj7q";

        typedJson.values[0] = JSONCIDVerifier.JsonValue(
            "Alice",
            JSONCIDVerifier.JsonValueType.STRING
        );
        typedJson.values[1] = JSONCIDVerifier.JsonValue(
            "30",
            JSONCIDVerifier.JsonValueType.NUMBER
        );
        typedJson.values[2] = JSONCIDVerifier.JsonValue(
            "true",
            JSONCIDVerifier.JsonValueType.BOOLEAN
        );
        typedJson.values[3] = JSONCIDVerifier.JsonValue(
            "",
            JSONCIDVerifier.JsonValueType.NULL
        );
    }

    // =============================================================================
    // buildStandardizedJson
    // =============================================================================

    function test_buildStandardizedJson_SimpleObject() public view {
        string memory result = verifier.buildStandardizedJson(simpleJson);
        assertEq(result, '{"name":"Alice","age":"30"}');
    }

    function test_buildStandardizedJson_SingleKeyValue() public view {
        JSONCIDVerifier.JsonObject memory singleJson;
        singleJson.keys = new string[](1);
        singleJson.values = new string[](1);
        singleJson.keys[0] = "test";
        singleJson.values[0] = "value";

        string memory result = verifier.buildStandardizedJson(singleJson);
        assertEq(result, '{"test":"value"}');
    }

    function test_buildStandardizedJson_EmptyValues() public view {
        JSONCIDVerifier.JsonObject memory emptyValueJson;
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
        JSONCIDVerifier.JsonObject memory mismatchJson;
        mismatchJson.keys = new string[](2);
        mismatchJson.values = new string[](1);
        mismatchJson.keys[0] = "key1";
        mismatchJson.keys[1] = "key2";
        mismatchJson.values[0] = "value1";

        vm.expectRevert(
            abi.encodeWithSelector(
                JSONCIDVerifier.LengthMismatch.selector,
                2,
                1
            )
        );
        verifier.buildStandardizedJson(mismatchJson);
    }

    function test_buildStandardizedJson_RevertOnEmptyObject() public {
        JSONCIDVerifier.JsonObject memory emptyJson;
        emptyJson.keys = new string[](0);
        emptyJson.values = new string[](0);

        vm.expectRevert(JSONCIDVerifier.EmptyJSONObject.selector);
        verifier.buildStandardizedJson(emptyJson);
    }

    // =============================================================================
    // buildStandardizedJsonTyped
    // =============================================================================

    function test_buildStandardizedJsonTyped_AllTypes() public view {
        string memory result = verifier.buildStandardizedJson(typedJson);
        assertEq(result, '{"name":"Alice","age":30,"active":true,"data":null}');
    }

    function test_buildStandardizedJsonTyped_StringOnly() public view {
        JSONCIDVerifier.TypedJsonObject memory stringOnlyJson;
        stringOnlyJson.keys = new string[](1);
        stringOnlyJson.values = new JSONCIDVerifier.JsonValue[](1);
        stringOnlyJson.keys[0] = "text";
        stringOnlyJson.values[0] = JSONCIDVerifier.JsonValue(
            "hello",
            JSONCIDVerifier.JsonValueType.STRING
        );

        string memory result = verifier.buildStandardizedJson(stringOnlyJson);
        assertEq(result, '{"text":"hello"}');
    }

    function test_buildStandardizedJsonTyped_NumberOnly() public view {
        JSONCIDVerifier.TypedJsonObject memory numberOnlyJson;
        numberOnlyJson.keys = new string[](1);
        numberOnlyJson.values = new JSONCIDVerifier.JsonValue[](1);
        numberOnlyJson.keys[0] = "count";
        numberOnlyJson.values[0] = JSONCIDVerifier.JsonValue(
            "42",
            JSONCIDVerifier.JsonValueType.NUMBER
        );

        string memory result = verifier.buildStandardizedJson(numberOnlyJson);
        assertEq(result, '{"count":42}');
    }

    function test_buildStandardizedJsonTyped_BooleanOnly() public view {
        JSONCIDVerifier.TypedJsonObject memory boolOnlyJson;
        boolOnlyJson.keys = new string[](2);
        boolOnlyJson.values = new JSONCIDVerifier.JsonValue[](2);
        boolOnlyJson.keys[0] = "isTrue";
        boolOnlyJson.keys[1] = "isFalse";
        boolOnlyJson.values[0] = JSONCIDVerifier.JsonValue(
            "true",
            JSONCIDVerifier.JsonValueType.BOOLEAN
        );
        boolOnlyJson.values[1] = JSONCIDVerifier.JsonValue(
            "false",
            JSONCIDVerifier.JsonValueType.BOOLEAN
        );

        string memory result = verifier.buildStandardizedJson(boolOnlyJson);
        assertEq(result, '{"isTrue":true,"isFalse":false}');
    }

    function test_buildStandardizedJsonTyped_NullOnly() public view {
        JSONCIDVerifier.TypedJsonObject memory nullOnlyJson;
        nullOnlyJson.keys = new string[](1);
        nullOnlyJson.values = new JSONCIDVerifier.JsonValue[](1);
        nullOnlyJson.keys[0] = "empty";
        nullOnlyJson.values[0] = JSONCIDVerifier.JsonValue(
            "",
            JSONCIDVerifier.JsonValueType.NULL
        );

        string memory result = verifier.buildStandardizedJson(nullOnlyJson);
        assertEq(result, '{"empty":null}');
    }

    // =============================================================================
    // Utility Functions
    // =============================================================================

    function test_getJsonBytes() public view {
        string memory json = '{"test":"value"}';
        bytes memory result = verifier.getJsonBytes(json);
        assertEq(result, bytes(json));
    }

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

    function test_getCIDBytes() public view {
        bytes
            memory multihash = hex"12201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        bytes memory cidBytes = verifier.getCIDBytes(multihash);

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

    function test_getCIDString_ValidInput() public view {
        // Valid CID bytes: CIDv1 + JSON codec + SHA-256 multihash
        bytes
            memory validCidBytes = hex"01800412201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

        string memory result = verifier.getCIDString(validCidBytes);

        // Should start with 'b' (base32 multibase prefix)
        bytes memory resultBytes = bytes(result);
        assertEq(resultBytes[0], "b");
        assertGt(resultBytes.length, 1);
    }

    function test_getCIDString_RevertOnInvalidLength() public {
        bytes memory invalidCidBytes = hex"0180041220"; // Too short

        vm.expectRevert("Invalid CID bytes length for json codec");
        verifier.getCIDString(invalidCidBytes);
    }

    function test_getCIDString_RevertOnInvalidVersion() public {
        bytes
            memory invalidCidBytes = hex"00800412201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

        vm.expectRevert("Not CIDv1");
        verifier.getCIDString(invalidCidBytes);
    }

    function test_getCIDString_RevertOnInvalidCodec() public {
        bytes
            memory invalidCidBytes = hex"01700412201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

        vm.expectRevert("Not Varint-encoded json codec (first byte)");
        verifier.getCIDString(invalidCidBytes);
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

    function test_generateCIDString_SimpleObject() public view {
        string memory cid = verifier.generateCIDString(simpleJson);

        bytes memory cidBytes = bytes(cid);
        assertEq(cidBytes[0], "b");
        assertGt(cidBytes.length, 50);

        assertEq(cid, expectedCIDSimple, "The CID is different from expected");
    }

    function test_generateCIDStringTyped_TypedObject() public view {
        string memory cid = verifier.generateCIDString(typedJson);

        bytes memory cidBytes = bytes(cid);
        assertEq(cidBytes[0], "b");
        assertGt(cidBytes.length, 50);

        assertEq(cid, expectedCIDTyped, "The CID is different from expected");
    }

    function test_verifyCID_ValidPair() public view {
        string memory cid = verifier.generateCIDString(simpleJson);
        assertTrue(verifier.verifyCID(simpleJson, cid));
    }

    function test_verifyCID_InvalidPair() public view {
        string memory cid = verifier.generateCIDString(simpleJson);

        // Create different JSON object
        JSONCIDVerifier.JsonObject memory differentJson;
        differentJson.keys = new string[](1);
        differentJson.values = new string[](1);
        differentJson.keys[0] = "different";
        differentJson.values[0] = "value";

        assertFalse(verifier.verifyCID(differentJson, cid));
    }

    function test_verifyCIDTyped_ValidPair() public view {
        string memory cid = verifier.generateCIDString(typedJson);
        assertTrue(verifier.verifyCID(typedJson, cid));
    }

    function test_verifyCIDTyped_InvalidPair() public view {
        string memory cid = verifier.generateCIDString(typedJson);

        // Create different typed JSON object
        JSONCIDVerifier.TypedJsonObject memory differentJson;
        differentJson.keys = new string[](1);
        differentJson.values = new JSONCIDVerifier.JsonValue[](1);
        differentJson.keys[0] = "different";
        differentJson.values[0] = JSONCIDVerifier.JsonValue(
            "value",
            JSONCIDVerifier.JsonValueType.STRING
        );

        assertFalse(verifier.verifyCID(differentJson, cid));
    }

    // =============================================================================
    // Consistency
    // =============================================================================

    function test_consistency_SameInputSameCID() public view {
        string memory cid1 = verifier.generateCIDString(simpleJson);
        string memory cid2 = verifier.generateCIDString(simpleJson);
        assertEq(cid1, cid2);
    }

    function test_consistency_DifferentInputDifferentCID() public view {
        JSONCIDVerifier.JsonObject memory differentJson;
        differentJson.keys = new string[](1);
        differentJson.values = new string[](1);
        differentJson.keys[0] = "different";
        differentJson.values[0] = "data";

        string memory cid1 = verifier.generateCIDString(simpleJson);
        string memory cid2 = verifier.generateCIDString(differentJson);

        assertFalse(verifier.stringEquals(cid1, cid2));
    }
}
