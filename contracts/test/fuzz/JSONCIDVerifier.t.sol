// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../../src/JSONCIDVerifier.sol";

contract JSONCIDVerifierTest is Test {
    JSONCIDVerifier public verifier;

    string constant JSON = '{"id":1}';
    string constant CID =
        "bagaaieraan6jefho65gmhcd7hjhqqw2oc7lwfag27uttwdxbmdajys5bz7ka";

    function setUp() public {
        verifier = new JSONCIDVerifier();
    }

    function testFuzzGenerateCIDString(string memory randomJSON) public view {
        vm.assume(bytes(randomJSON).length > 0);

        string memory generatedCID = verifier.generateCIDString(randomJSON);

        assertTrue(bytes(generatedCID).length > 0, "CID should not be empty");
        assertTrue(bytes(generatedCID)[0] == "b", "CID should start with 'b'");
    }

    function testFuzzVerifyCID(
        string memory randomJSON,
        string memory randomCID
    ) public view {
        vm.assume(bytes(randomJSON).length > 0);
        vm.assume(bytes(randomCID).length > 0);

        (bool success, string memory message) = verifier.verifyCID(
            randomJSON,
            randomCID
        );

        assertTrue(bytes(message).length > 0, "Message should not be empty");

        if (success) {
            assertEq(
                message,
                "Verification successful",
                "Success message should be correct"
            );
        } else {
            assertEq(
                message,
                "Generated CID does not match expected CID string",
                "Failure message should be correct"
            );
        }
    }
}
