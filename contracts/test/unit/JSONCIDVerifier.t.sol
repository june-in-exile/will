// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../../src/JSONCIDVerifier.sol";

contract JSONCIDVerifierUnitTest is Test {
    JSONCIDVerifier public verifier;

    string constant JSON = '{"id":1}';
    string constant CID =
        "bagaaieraan6jefho65gmhcd7hjhqqw2oc7lwfag27uttwdxbmdajys5bz7ka";

    function setUp() public {
        verifier = new JSONCIDVerifier();
    }

    function testGenerateCIDString() public view {
        string memory generatedCID = verifier.generateCIDString(JSON);

        assertEq(generatedCID, CID, "Generated CID should match expected CID");
    }

    function testVerifyCIDSuccess() public view {
        (bool success, string memory message) = verifier.verifyCID(JSON, CID);

        assertTrue(success, "Verification should succeed");
        assertEq(
            message,
            "Verification successful",
            "Should return success message"
        );
    }

    function testVerifyCIDWithDifferentCID() public view {
        string
            memory wrongCID = "bagaaieraan6jefho65gmhcd7hjhqqw2oc7lwfag27uttwdxbmdajys5bz7kb"; // Changed last character

        (bool success, string memory message) = verifier.verifyCID(
            JSON,
            wrongCID
        );

        assertFalse(success, "Verification should fail with wrong CID");
        assertEq(
            message,
            "Generated CID does not match expected CID string",
            "Should return failure message"
        );
    }

    function testVerifyCIDWithDifferentJSON() public view {
        string memory differentJSON = '{"id":2}';

        (bool success, string memory message) = verifier.verifyCID(
            differentJSON,
            CID
        );

        assertFalse(success, "Verification should fail with different JSON");
        assertEq(
            message,
            "Generated CID does not match expected CID string",
            "Should return failure message for different JSON"
        );
    }
}
