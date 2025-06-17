// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/JSONCIDVerifier.sol";

contract JSONCIDVerifierUnitTest is Test {
    JSONCIDVerifier public verifier;

    // string constant JSON = '{"id":1}';
    // string constant CID =
    //     "bagaaieraan6jefho65gmhcd7hjhqqw2oc7lwfag27uttwdxbmdajys5bz7ka";
    string constant JSON =
        '{"algorithm": "aes-256-gcm","iv": "9jESTqILJek00GDq","authTag": "drpeTcbsxic9s2quNm/Lng==","ciphertext": "yRZRY6ZR78ugBRwdSkpbwjL0z/q0ib8Aizedrb1QmzJVaI1bLqlgPmY4j6t7Ds1Yvp2IBz+R2Whe4IZNWnGA/RvvUZJQ510MMU5hmJLtFrMmTYEmOQXP+Bpa5IORKu+k2zB95UPEK+hkOHo+LOT1TEtu/AH/X5EbNXTzuHxx3VUmh7lb8Gf4w4kPK+9FD5mbVxDqKm9jF+QvjhTpQavmFXOAZtXubFDOYd4JvG7JFdtVVcUh0B3RiUXNJV80B4/3IG2mDJLCCzNvr9KrgIuJOEXNCKeKwjIc7Spjsw67YcyjkYzs1oHP0UgUpMBbmY6WFpGjFMdbZHGzi//yuA/QYxiHPnQvrHFsgDbhG6zDqG4smT5bLAj9RkPN+J0mq7sIwSfs7VwQaZvHR9IwiZfxoV63Pkam8m+uCSRW/6MOb3oYgYolNtgM/VrOBmpi/69/drX4aaZRnJMHxkuisBPLGOfGQxciz4QkN1kvVXJgtaKjBuzjsiADX3Ln2tAgZ1Z+Lh4yhyBJALb1MPHmhJM0bfREEf/G9ZYRILNcjEF6+pyDsXpSac1r/vSK0GOJDa1zOtsYWB9dNAFpVY8oOs6/gyEko5GoqDh5FOcPkJu+twWPlCp8rsqN2FrMAm75D9WlfGqQzJUDn80XvuJ/gCUAz29GADxyu3H3COGJHHsKkCHEvP45xfcsNttIUS5Fq1ObonoKG+L2wTNX9C36H6uRLw/KGgfHATgOYzfNS5I2vfEHqeSDntL5Rwj7Nqur+GoC7AaJUfqZesMVs5JxWNGTQjcJB8yVYknuz+aOBwybr2Wl6tmTSejWr+6c3qE+Zc37Y2j/gM/sUkxO7x2Wi0p74c5Fsf2zxtK/qmWXrju9OXdOHmX/0jZYytoVJjR7QLHjAV8/EQ1c2tUEaqJdL4rpOUIBBDak4oA2zdetHBOriO1c2JHXV48Wf+fh9WP+8ikn8EAFzKBR/2T7PcveFtjJQWIm5Qqeg4/LIhKv4XlMwr+gsTel1oBdAPy0Bi21OM90XV1RkL6Kntq7oyE4GM1BRRubIXDfQ1MAJdCf5/7Tvjwpn97KYJy88unNGv78DnwIMSZGMHXOD+3jag5oYxc6keuJytN1WR7I+/Z/k7YXfkpmRmn3kgig71/NpOdsAndWri9a6U+pDW1FItlaLIqbQjKUHlOh5f59+/2YQqZm4ncJlqXRLPSkuGYXvCCaQt3plADspFGUFWpAlbSZh8jk3XzqINkQjZiNEo+4Tbg=","timestamp": "2025-06-16T15:48:00.913Z"}';
    string constant CID =
        "bagaaiera2ee2cotcjsuxep6ligx74qklmv4bg6s6aizvl5xqaytfvvtcoucq";

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
