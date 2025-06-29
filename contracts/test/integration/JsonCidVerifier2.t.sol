// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "src/JsonCidVerifier.sol";

/**
 * @title JsonCidVerifierIntegrationTest
 * @dev Integration tests that verify the complete workflow and real-world scenarios
 */
contract JsonCidVerifierIntegrationTest is Test {
    JsonCidVerifier verifier;

    // Known test vectors (generate these using your JavaScript implementation)
    struct TestVector {
        string name;
        JsonCidVerifier.JsonObject jsonObj;
        JsonCidVerifier.TypedJsonObject typedJsonObj;
        string expectedCIDSimple;
        string expectedCIDTyped;
        string expectedJSON;
        string expectedTypedJSON;
    }

    TestVector[] testVectors;

    function setUp() public {
        verifier = new JsonCidVerifier();
        _setupTestVectors();
    }

    function _setupTestVectors() internal {
        // Test Vector 1: Simple object
        {
            JsonCidVerifier.JsonObject memory simpleObj;
            simpleObj.keys = new string[](2);
            simpleObj.values = new string[](2);
            simpleObj.keys[0] = "name";
            simpleObj.keys[1] = "age";
            simpleObj.values[0] = "Alice";
            simpleObj.values[1] = "30";

            JsonCidVerifier.TypedJsonObject memory typedObj;
            typedObj.keys = new string[](2);
            typedObj.values = new JsonCidVerifier.JsonValue[](2);
            typedObj.keys[0] = "name";
            typedObj.keys[1] = "age";
            typedObj.values[0] = JsonCidVerifier.JsonValue(
                "Alice",
                JsonCidVerifier.JsonValueType.STRING
            );
            typedObj.values[1] = JsonCidVerifier.JsonValue(
                "30",
                JsonCidVerifier.JsonValueType.NUMBER
            );

            // Note: The CIDs are Generated from JavaScript implementation
            testVectors.push(
                TestVector({
                    name: "Simple Name-Age Object",
                    jsonObj: simpleObj,
                    typedJsonObj: typedObj,
                    expectedCIDSimple: "bagaaiera6ngbuvxsgagyxdm57ezcxhaejaouxn3f4maackcasdhquv4dt56a",
                    expectedCIDTyped: "bagaaierahyt2wszp67wmtf4u6sppuwsmqtkhq7ecozarv7dgnkna55zpxg4a", // To be filled with actual CID
                    expectedJSON: '{"name":"Alice","age":"30"}',
                    expectedTypedJSON: '{"name":"Alice","age":30}'
                })
            );
        }

        // Test Vector 2: Complex object with all types
        {
            JsonCidVerifier.JsonObject memory simpleObj;
            simpleObj.keys = new string[](4);
            simpleObj.values = new string[](4);
            simpleObj.keys[0] = "active";
            simpleObj.keys[1] = "count";
            simpleObj.keys[2] = "data";
            simpleObj.keys[3] = "name";
            simpleObj.values[0] = "true";
            simpleObj.values[1] = "42";
            simpleObj.values[2] = "";
            simpleObj.values[3] = "test";

            JsonCidVerifier.TypedJsonObject memory typedObj;
            typedObj.keys = new string[](4);
            typedObj.values = new JsonCidVerifier.JsonValue[](4);
            typedObj.keys[0] = "active";
            typedObj.keys[1] = "count";
            typedObj.keys[2] = "data";
            typedObj.keys[3] = "name";
            typedObj.values[0] = JsonCidVerifier.JsonValue(
                "true",
                JsonCidVerifier.JsonValueType.BOOLEAN
            );
            typedObj.values[1] = JsonCidVerifier.JsonValue(
                "42",
                JsonCidVerifier.JsonValueType.NUMBER
            );
            typedObj.values[2] = JsonCidVerifier.JsonValue(
                "",
                JsonCidVerifier.JsonValueType.NULL
            );
            typedObj.values[3] = JsonCidVerifier.JsonValue(
                "test",
                JsonCidVerifier.JsonValueType.STRING
            );

            testVectors.push(
                TestVector({
                    name: "Complex All-Types Object",
                    jsonObj: simpleObj,
                    typedJsonObj: typedObj,
                    expectedCIDSimple: "bagaaierawedn3djabwgj3lxctpkxk3jg3wkc7ywqveexclgfxwgy4nn6lpaa",
                    expectedCIDTyped: "bagaaieragimrcyhoitiwmqhqker3zaj2gaqwlh2ccpfm2l3wpybljwpqghmq",
                    expectedJSON: '{"active":"true","count":"42","data":"","name":"test"}',
                    expectedTypedJSON: '{"active":true,"count":42,"data":null,"name":"test"}'
                })
            );
        }
    }

    // =============================================================================
    // Complete Workflow
    // =============================================================================

    function test_completeWorkflow_Simple() public view {
        TestVector memory tv = testVectors[0];

        // 1. Build standardized JSON
        string memory actualJSON = verifier.buildStandardizedJson(tv.jsonObj);
        assertEq(actualJSON, tv.expectedJSON, "JSON format mismatch");

        // 2. Generate CID
        string memory generatedCID = verifier.generateCIDString(tv.jsonObj);

        // 3. Verify CID
        bytes memory cidBytes = bytes(generatedCID);
        assertEq(cidBytes[0], "b", "CID should start with 'b'");
        assertGt(cidBytes.length, 50, "CID should be reasonably long");
        assertEq(generatedCID, tv.expectedCIDSimple);

        // 4. Verify self-consistency
        assertTrue(
            verifier.verifyCID(tv.jsonObj, generatedCID),
            "Self-verification failed"
        );

        // 5. Test immutability - same input should give same CID
        string memory secondCID = verifier.generateCIDString(tv.jsonObj);
        assertTrue(
            verifier.stringEquals(generatedCID, secondCID),
            "CID generation not deterministic"
        );
    }

    function test_completeWorkflow_Typed() public view {
        TestVector memory tv = testVectors[1];

        // 1. Build standardized JSON
        string memory actualJSON = verifier.buildStandardizedJson(
            tv.typedJsonObj
        );
        assertEq(
            actualJSON,
            tv.expectedTypedJSON,
            "Typed JSON format mismatch"
        );

        // 2. Generate CID
        string memory generatedCID = verifier.generateCIDString(
            tv.typedJsonObj
        );

        // 3. Verify CID
        bytes memory cidBytes = bytes(generatedCID);
        assertEq(cidBytes[0], "b", "CID should start with 'b'");
        assertGt(cidBytes.length, 50, "CID should be reasonably long");
        assertEq(generatedCID, tv.expectedCIDTyped);

        // 4. Verify self-consistency
        assertTrue(
            verifier.verifyCID(tv.typedJsonObj, generatedCID),
            "Self-verification failed"
        );

        // 5. Test immutability
        string memory secondCID = verifier.generateCIDString(tv.typedJsonObj);
        assertTrue(
            verifier.stringEquals(generatedCID, secondCID),
            "CID generation not deterministic"
        );
    }

    function test_simpleVsTyped_DifferentCIDs() public view {
        TestVector memory tv = testVectors[0];

        string memory simpleCID = verifier.generateCIDString(tv.jsonObj);
        string memory typedCID = verifier.generateCIDString(tv.typedJsonObj);

        // These should be different because the JSON representations are different
        // Simple: {"name":"Alice","age":"30"}
        // Typed:  {"name":"Alice","age":30}
        assertFalse(
            verifier.stringEquals(simpleCID, typedCID),
            "Simple and typed CIDs should differ"
        );
    }

    // =============================================================================
    // Real-world Scenarios
    // =============================================================================

    function test_realWorld_UserProfile() public view {
        // Simulate a user profile object
        JsonCidVerifier.JsonObject memory profile;
        profile.keys = new string[](6);
        profile.values = new string[](6);
        profile.keys[0] = "email";
        profile.keys[1] = "id";
        profile.keys[2] = "isVerified";
        profile.keys[3] = "lastLogin";
        profile.keys[4] = "name";
        profile.keys[5] = "role";
        profile.values[0] = "alice@example.com";
        profile.values[1] = "12345";
        profile.values[2] = "true";
        profile.values[3] = "1640995200";
        profile.values[4] = "Alice Johnson";
        profile.values[5] = "admin";

        string memory cid = verifier.generateCIDString(profile);
        assertTrue(verifier.verifyCID(profile, cid));

        // Should produce valid JSON
        string memory json = verifier.buildStandardizedJson(profile);
        string
            memory expectedJSON = '{"email":"alice@example.com","id":"12345","isVerified":"true","lastLogin":"1640995200","name":"Alice Johnson","role":"admin"}';
        assertEq(json, expectedJSON);
    }

    function test_realWorld_APIResponse() public view {
        // Simulate an API response object
        JsonCidVerifier.TypedJsonObject memory response;
        response.keys = new string[](4);
        response.values = new JsonCidVerifier.JsonValue[](4);
        response.keys[0] = "data";
        response.keys[1] = "error";
        response.keys[2] = "status";
        response.keys[3] = "timestamp";
        response.values[0] = JsonCidVerifier.JsonValue(
            "user_data_here",
            JsonCidVerifier.JsonValueType.STRING
        );
        response.values[1] = JsonCidVerifier.JsonValue(
            "",
            JsonCidVerifier.JsonValueType.NULL
        );
        response.values[2] = JsonCidVerifier.JsonValue(
            "200",
            JsonCidVerifier.JsonValueType.NUMBER
        );
        response.values[3] = JsonCidVerifier.JsonValue(
            "1640995200",
            JsonCidVerifier.JsonValueType.NUMBER
        );

        string memory cid = verifier.generateCIDString(response);
        assertTrue(verifier.verifyCID(response, cid));

        // Should produce valid typed JSON
        string memory json = verifier.buildStandardizedJson(response);
        string
            memory expectedJSON = '{"data":"user_data_here","error":null,"status":200,"timestamp":1640995200}';
        assertEq(json, expectedJSON);
    }

    function test_realWorld_ConfigurationFile() public view {
        // Simulate a configuration file
        JsonCidVerifier.TypedJsonObject memory config;
        config.keys = new string[](5);
        config.values = new JsonCidVerifier.JsonValue[](5);
        config.keys[0] = "debug";
        config.keys[1] = "maxConnections";
        config.keys[2] = "serverName";
        config.keys[3] = "timeout";
        config.keys[4] = "version";
        config.values[0] = JsonCidVerifier.JsonValue(
            "false",
            JsonCidVerifier.JsonValueType.BOOLEAN
        );
        config.values[1] = JsonCidVerifier.JsonValue(
            "100",
            JsonCidVerifier.JsonValueType.NUMBER
        );
        config.values[2] = JsonCidVerifier.JsonValue(
            "prod-server-01",
            JsonCidVerifier.JsonValueType.STRING
        );
        config.values[3] = JsonCidVerifier.JsonValue(
            "30",
            JsonCidVerifier.JsonValueType.NUMBER
        );
        config.values[4] = JsonCidVerifier.JsonValue(
            "1.2.3",
            JsonCidVerifier.JsonValueType.STRING
        );

        string memory cid = verifier.generateCIDString(config);
        assertTrue(verifier.verifyCID(config, cid));

        string memory json = verifier.buildStandardizedJson(config);
        string
            memory expectedJSON = '{"debug":false,"maxConnections":100,"serverName":"prod-server-01","timeout":30,"version":"1.2.3"}';
        assertEq(json, expectedJSON);
    }

    // =============================================================================
    // Cross-verification
    // =============================================================================

    function test_crossVerification_InvalidCIDs() public view {
        TestVector memory tv = testVectors[0];

        // Generate valid CID
        string memory validCID = verifier.generateCIDString(tv.jsonObj);

        // Test with invalid CIDs
        assertFalse(verifier.verifyCID(tv.jsonObj, "invalid_cid"));
        assertFalse(verifier.verifyCID(tv.jsonObj, ""));
        assertFalse(verifier.verifyCID(tv.jsonObj, "bafkreiinvalid"));

        // Test with valid format but wrong content
        string
            memory differentCID = "bafkreiabcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopqrstuvwx";
        assertFalse(verifier.verifyCID(tv.jsonObj, differentCID));

        // Original should still work
        assertTrue(verifier.verifyCID(tv.jsonObj, validCID));
    }

    function test_crossVerification_ModifiedObjects() public view {
        TestVector memory tv = testVectors[0];
        string memory originalCID = verifier.generateCIDString(tv.jsonObj);

        // Modify keys
        JsonCidVerifier.JsonObject memory modifiedObj = tv.jsonObj;
        modifiedObj.keys[0] = "modified_name";

        assertFalse(verifier.verifyCID(modifiedObj, originalCID));

        // Modify values
        modifiedObj = tv.jsonObj;
        modifiedObj.values[0] = "Bob";

        assertFalse(verifier.verifyCID(modifiedObj, originalCID));

        // Add extra field
        modifiedObj.keys = new string[](3);
        modifiedObj.values = new string[](3);
        modifiedObj.keys[0] = tv.jsonObj.keys[0];
        modifiedObj.keys[1] = tv.jsonObj.keys[1];
        modifiedObj.keys[2] = "extra";
        modifiedObj.values[0] = tv.jsonObj.values[0];
        modifiedObj.values[1] = tv.jsonObj.values[1];
        modifiedObj.values[2] = "field";

        assertFalse(verifier.verifyCID(modifiedObj, originalCID));
    }

    // =============================================================================
    // Performance and Gas
    // =============================================================================

    function test_performance_LargeObject() public view {
        // Create a larger JSON object (20 fields)
        JsonCidVerifier.JsonObject memory largeObj;
        largeObj.keys = new string[](20);
        largeObj.values = new string[](20);

        for (uint256 i = 0; i < 20; i++) {
            largeObj.keys[i] = string.concat("field", vm.toString(i));
            largeObj.values[i] = string.concat("value", vm.toString(i));
        }

        // Should handle large objects without issues
        uint256 gasBefore = gasleft();
        string memory cid = verifier.generateCIDString(largeObj);
        uint256 gasUsed = gasBefore - gasleft();

        // Verify it works
        assertTrue(verifier.verifyCID(largeObj, cid));

        // Log gas usage for analysis
        console.log("Gas used for 20-field object:", gasUsed);

        // Should be under reasonable gas limit (adjust as needed)
        assertLt(gasUsed, 2000000, "Gas usage too high for large object");
    }

    function test_performance_RepeatedOperations() public view {
        TestVector memory tv = testVectors[0];

        // Generate CID multiple times - should be consistent and efficient
        string memory cid1 = verifier.generateCIDString(tv.jsonObj);
        string memory cid2 = verifier.generateCIDString(tv.jsonObj);
        string memory cid3 = verifier.generateCIDString(tv.jsonObj);

        // All should be identical
        assertTrue(verifier.stringEquals(cid1, cid2));
        assertTrue(verifier.stringEquals(cid2, cid3));

        // Verification should be consistent
        assertTrue(verifier.verifyCID(tv.jsonObj, cid1));
        assertTrue(verifier.verifyCID(tv.jsonObj, cid2));
        assertTrue(verifier.verifyCID(tv.jsonObj, cid3));
    }

    // =============================================================================
    // Edge Cases
    // =============================================================================

    function test_edgeCase_SingleField() public view {
        JsonCidVerifier.JsonObject memory singleField;
        singleField.keys = new string[](1);
        singleField.values = new string[](1);
        singleField.keys[0] = "single";
        singleField.values[0] = "value";

        string memory json = verifier.buildStandardizedJson(singleField);
        assertEq(json, '{"single":"value"}');

        string memory cid = verifier.generateCIDString(singleField);
        assertTrue(verifier.verifyCID(singleField, cid));
    }

    function test_edgeCase_EmptyStringValues() public view {
        JsonCidVerifier.JsonObject memory emptyValues;
        emptyValues.keys = new string[](2);
        emptyValues.values = new string[](2);
        emptyValues.keys[0] = "empty";
        emptyValues.keys[1] = "blank";
        emptyValues.values[0] = "";
        emptyValues.values[1] = "";

        string memory json = verifier.buildStandardizedJson(emptyValues);
        assertEq(json, '{"empty":"","blank":""}');

        string memory cid = verifier.generateCIDString(emptyValues);
        assertTrue(verifier.verifyCID(emptyValues, cid));
    }

    function test_edgeCase_SpecialCharacters() public view {
        JsonCidVerifier.JsonObject memory specialChars;
        specialChars.keys = new string[](3);
        specialChars.values = new string[](3);
        specialChars.keys[0] = "numbers";
        specialChars.keys[1] = "symbols";
        specialChars.keys[2] = "unicode";
        specialChars.values[0] = "1234567890";
        specialChars.values[1] = "!@#$%^&*()";
        specialChars.values[2] = unicode"Hello 世界 🌍";

        string memory json = verifier.buildStandardizedJson(specialChars);
        assertTrue(bytes(json).length > 0);

        string memory cid = verifier.generateCIDString(specialChars);
        assertTrue(verifier.verifyCID(specialChars, cid));
    }
}
