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
        string expectedCidSimple;
        string expectedCidTyped;
        string expectedJSON;
        string expectedTypedJSON;
    }

    TestVector[] testVectors;

    function setUp() public {
        verifier = new JsonCidVerifier();
        _setupTestVectors();
    }

    function _setupTestVectors() internal {
        {
            JsonCidVerifier.JsonObject memory simpleObj;
            simpleObj.keys = new string[](3);
            simpleObj.values = new string[](3);
            simpleObj.keys[0] = "name";
            simpleObj.keys[1] = "age";
            simpleObj.keys[2] = "measurements";
            simpleObj.values[0] = "Alice";
            simpleObj.values[1] = "30";
            simpleObj.values[2] = "[84,61,90]";

            JsonCidVerifier.TypedJsonObject memory typedObj;
            typedObj.keys = new string[](3);
            typedObj.values = new JsonCidVerifier.JsonValue[](3);
            typedObj.keys[0] = "name";
            typedObj.keys[1] = "age";
            typedObj.keys[2] = "measurements";
            typedObj.values[0] = JsonCidVerifier.JsonValue("Alice", new uint256[](0), JsonCidVerifier.JsonValueType.STRING);
            typedObj.values[1] = JsonCidVerifier.JsonValue("30", new uint256[](0), JsonCidVerifier.JsonValueType.NUMBER);
            uint256[] memory measurementsArr = new uint256[](3);
            measurementsArr[0] = 84;
            measurementsArr[1] = 61;
            measurementsArr[2] = 90;
            typedObj.values[2] = JsonCidVerifier.JsonValue("", measurementsArr, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);

            // @note The CIDs are Generated from TypeScript implementation
            testVectors.push(
                TestVector({
                    name: "Simple Name-Age Object",
                    jsonObj: simpleObj,
                    typedJsonObj: typedObj,
                    expectedCidSimple: "bagaaierayeldai4jgkbslacut6yde7sjbuqw4zwg755usm2fw5hs35che74q",
                    expectedCidTyped: "bagaaiera6cn3wl6afd25fjk7g2pfk4vkaolb3u7adzw4wfgi4r3m7cwarhbq",
                    expectedJSON: '{"name":"Alice","age":"30","measurements":"[84,61,90]"}',
                    expectedTypedJSON: '{"name":"Alice","age":30,"measurements":[84,61,90]}'
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
        string memory generatedCid = verifier.generateCidString(tv.jsonObj);

        // 3. Verify CID
        bytes memory cidBytes = bytes(generatedCid);
        assertEq(cidBytes[0], "b", "CID should start with 'b'");
        assertGt(cidBytes.length, 50, "CID should be reasonably long");
        assertEq(generatedCid, tv.expectedCidSimple);

        // 4. Verify self-consistency
        assertTrue(verifier.verifyCid(tv.jsonObj, generatedCid), "Self-verification failed");

        // 5. Test immutability - same input should give same CID
        string memory secondCid = verifier.generateCidString(tv.jsonObj);
        assertTrue(verifier.stringEquals(generatedCid, secondCid), "CID generation not deterministic");
    }

    function test_completeWorkflow_Typed() public view {
        TestVector memory tv = testVectors[0];

        // 1. Build standardized JSON
        string memory actualJSON = verifier.buildStandardizedJson(tv.typedJsonObj);
        assertEq(actualJSON, tv.expectedTypedJSON, "Typed JSON format mismatch");

        // 2. Generate CID
        string memory generatedCid = verifier.generateCidString(tv.typedJsonObj);

        // 3. Verify CID
        bytes memory cidBytes = bytes(generatedCid);
        assertEq(cidBytes[0], "b", "CID should start with 'b'");
        assertGt(cidBytes.length, 50, "CID should be reasonably long");
        assertEq(generatedCid, tv.expectedCidTyped);

        // 4. Verify self-consistency
        assertTrue(verifier.verifyCid(tv.typedJsonObj, generatedCid), "Self-verification failed");

        // 5. Test immutability
        string memory secondCid = verifier.generateCidString(tv.typedJsonObj);
        assertTrue(verifier.stringEquals(generatedCid, secondCid), "CID generation not deterministic");
    }

    function test_simpleVsTyped_DifferentCids() public view {
        TestVector memory tv = testVectors[0];

        string memory simpleCid = verifier.generateCidString(tv.jsonObj);
        string memory typedCid = verifier.generateCidString(tv.typedJsonObj);

        // These should be different because the JSON representations are different
        // Simple: {"name":"Alice","age":"30","measurements":"[84,61,90]"}
        // Typed:  {"name":"Alice","age":30,"measurements":[84,61,90]}
        assertFalse(verifier.stringEquals(simpleCid, typedCid), "Simple and typed CIDs should differ");
    }

    // =============================================================================
    // Cross-verification
    // =============================================================================

    function test_crossVerification_InvalidCids() public view {
        TestVector memory tv = testVectors[0];

        // Generate valid CID
        string memory validCid = verifier.generateCidString(tv.jsonObj);

        // Test with invalid CIDs
        assertFalse(verifier.verifyCid(tv.jsonObj, "invalid_cid"));
        assertFalse(verifier.verifyCid(tv.jsonObj, ""));
        assertFalse(verifier.verifyCid(tv.jsonObj, "bafkreiinvalid"));

        // Test with valid format but wrong content
        string memory differentCid = "bafkreiabcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopqrstuvwx";
        assertFalse(verifier.verifyCid(tv.jsonObj, differentCid));

        // Original should still work
        assertTrue(verifier.verifyCid(tv.jsonObj, validCid));
    }

    function test_crossVerification_ModifiedObjects() public view {
        TestVector memory tv = testVectors[0];
        string memory originalCid = verifier.generateCidString(tv.jsonObj);

        // Modify keys
        JsonCidVerifier.JsonObject memory modifiedObj = tv.jsonObj;
        modifiedObj.keys[0] = "modified_name";

        assertFalse(verifier.verifyCid(modifiedObj, originalCid));

        // Modify values
        modifiedObj = tv.jsonObj;
        modifiedObj.values[0] = "Bob";

        assertFalse(verifier.verifyCid(modifiedObj, originalCid));

        // Add extra field
        modifiedObj.keys = new string[](3);
        modifiedObj.values = new string[](3);
        modifiedObj.keys[0] = tv.jsonObj.keys[0];
        modifiedObj.keys[1] = tv.jsonObj.keys[1];
        modifiedObj.keys[2] = "extra";
        modifiedObj.values[0] = tv.jsonObj.values[0];
        modifiedObj.values[1] = tv.jsonObj.values[1];
        modifiedObj.values[2] = "field";

        assertFalse(verifier.verifyCid(modifiedObj, originalCid));
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
        string memory cid = verifier.generateCidString(largeObj);
        uint256 gasUsed = gasBefore - gasleft();

        // Verify it works
        assertTrue(verifier.verifyCid(largeObj, cid));

        // Log gas usage for analysis
        console.log("Gas used for 20-field object:", gasUsed);

        // Should be under reasonable gas limit (adjust as needed)
        assertLt(gasUsed, 2000000, "Gas usage too high for large object");
    }

    function test_performance_RepeatedOperations() public view {
        TestVector memory tv = testVectors[0];

        // Generate CID multiple times - should be consistent and efficient
        string memory cid1 = verifier.generateCidString(tv.jsonObj);
        string memory cid2 = verifier.generateCidString(tv.jsonObj);
        string memory cid3 = verifier.generateCidString(tv.jsonObj);

        // All should be identical
        assertTrue(verifier.stringEquals(cid1, cid2));
        assertTrue(verifier.stringEquals(cid2, cid3));

        // Verification should be consistent
        assertTrue(verifier.verifyCid(tv.jsonObj, cid1));
        assertTrue(verifier.verifyCid(tv.jsonObj, cid2));
        assertTrue(verifier.verifyCid(tv.jsonObj, cid3));
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

        string memory cid = verifier.generateCidString(singleField);
        assertTrue(verifier.verifyCid(singleField, cid));
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

        string memory cid = verifier.generateCidString(emptyValues);
        assertTrue(verifier.verifyCid(emptyValues, cid));
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

        string memory cid = verifier.generateCidString(specialChars);
        assertTrue(verifier.verifyCid(specialChars, cid));
    }
}
