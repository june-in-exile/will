// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title JSONCIDVerifier
 * @dev A contract for verifying that JSON content corresponds to its IPFS CID using json codec
 * @notice This contract verifies JSON content against its IPFS CID v1 representation with json codec
 */
contract JSONCIDVerifier {
    constructor() {}

    /**
     * @dev Complete verification workflow
     * @param json The JSON content to verify
     * @param cid Expected CID string
     * @return success Whether verification succeeded
     * @return message Result message
     */
    function verifyCID(
        string memory json,
        string memory cid
    ) external pure returns (bool success, string memory message) {
        string memory generatedCID = generateCIDString(json);

        if (!stringEquals(generatedCID, cid)) {
            return (false, "Generated CID does not match expected CID string");
        }

        return (true, "Verification successful");
    }

    /**
     * @dev Generate CID string for given JSON data
     * @param json The JSON data to generate CID for
     * @return Generated CID string
     */
    function generateCIDString(
        string memory json
    ) public pure returns (string memory) {
        bytes memory contentBytes = getBytes(json);
        bytes memory contentMultihash = getContentMultihash(contentBytes);
        bytes memory cidBytes = getCIDBytes(contentMultihash);
        return getCIDString(cidBytes);
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    function getBytes(string memory json) public pure returns (bytes memory) {
        return bytes(json);
    }

    function getContentMultihash(
        bytes memory contentBytes
    ) public pure returns (bytes memory) {
        bytes32 rawHash = sha256(contentBytes);
        bytes memory multihash = new bytes(34); // 2 bytes prefix + 32 bytes hash

        multihash[0] = 0x12; // SHA-256 hash type
        multihash[1] = 0x20; // Hash length (32 bytes)

        // Copy the 32-byte hash
        for (uint256 i = 0; i < 32; i++) {
            multihash[2 + i] = rawHash[i];
        }

        return multihash;
    }

    function getCIDBytes(
        bytes memory contentHash
    ) public pure returns (bytes memory) {
        bytes memory result = new bytes(37);

        result[0] = 0x01; // CIDv1
        result[1] = 0x80; // json codec (0x0200 in varint is 0x80 0x04)
        result[2] = 0x04; // json codec second byte

        // Copy hash value
        for (uint256 i = 0; i < 34; i++) {
            result[3 + i] = contentHash[i];
        }

        return result;
    }

    /**
     * @dev Convert CID bytes to base32 string
     * @param cidBytes Binary CID representation
     * @return Base32 encoded CID string
     */
    function getCIDString(
        bytes memory cidBytes
    ) public pure returns (string memory) {
        // CIDv1 byte format: [version][codec][hash_type][hash_length][hash_bytes]
        require(
            cidBytes.length == 37,
            "Invalid CID bytes length for json codec"
        );
        require(cidBytes[0] == 0x01, "Not CIDv1");
        require(
            cidBytes[1] == 0x80,
            "Not Varint-encoded json codec (first byte)"
        );
        require(
            cidBytes[2] == 0x04,
            "Not Varint-encoded json codec (second byte)"
        );
        require(cidBytes[3] == 0x12, "Not SHA-256 hash");
        require(cidBytes[4] == 0x20, "Invalid hash length");

        // Perform base32 encoding
        return encodeBase32(cidBytes);
    }

    /**
     * @dev Base32 encoding implementation
     * @dev Uses IPFS standard base32 alphabet: abcdefghijklmnopqrstuvwxyz234567
     * @param data Data to encode
     * @return Base32 encoded string with multibase prefix
     */
    function encodeBase32(
        bytes memory data
    ) internal pure returns (string memory) {
        if (data.length == 0) return "";

        // IPFS base32 alphabet
        bytes memory alphabet = "abcdefghijklmnopqrstuvwxyz234567";

        // Calculate output length
        uint256 outputLength = (data.length * 8 + 4) / 5;
        bytes memory result = new bytes(outputLength + 1); // +1 for multibase prefix

        // Add multibase prefix 'b' for base32
        result[0] = "b";

        uint256 bits = 0;
        uint256 value = 0;
        uint256 outputIndex = 1;

        for (uint256 i = 0; i < data.length; i++) {
            value = (value << 8) | uint8(data[i]);
            bits += 8;

            while (bits >= 5) {
                bits -= 5;
                uint256 index = (value >> bits) & 0x1F;
                result[outputIndex++] = alphabet[index];
            }
        }

        if (bits > 0) {
            uint256 index = (value << (5 - bits)) & 0x1F;
            result[outputIndex++] = alphabet[index];
        }

        // Adjust result length
        bytes memory finalResult = new bytes(outputIndex);
        for (uint256 i = 0; i < outputIndex; i++) {
            finalResult[i] = result[i];
        }

        return string(finalResult);
    }

    function stringEquals(
        string memory a,
        string memory b
    ) public pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}
