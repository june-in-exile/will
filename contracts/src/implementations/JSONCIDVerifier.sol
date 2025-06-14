// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * @title CIDVerifier
 * @dev A general contract for verifying that JSON content corresponds to its IPFS CID
 * @notice This contract can verify any JSON content against its IPFS CID v1 representation
 */
contract JSONCIDVerifier {
    constructor() {}

    /**
     * @dev Complete verification workflow
     * @param json The json to verify
     * @param cid Expected CID string
     * @return success Whether verification succeeded
     * @return message Result message
     */
    function verifyCID(
        string memory json,
        string memory cid
    ) external pure returns (bool success, string memory message) {
        // 1. Check CID string format
        (bool formatValid, string memory formatReason) = verifyCIDStringFormat(
            cid
        );

        if (!formatValid) {
            return (
                false,
                string(abi.encodePacked("CID format error: ", formatReason))
            );
        }

        // 2. Execute complete on-chain verification
        verifyJSONToCID(json, cid);
        return (true, "Verification successful");
    }

    /**
     * @dev Verify CID string format (basic validation)
     * @param cidString CID string to validate
     * @return isValid Whether format is valid
     * @return reason Reason if invalid
     */
    function verifyCIDStringFormat(
        string memory cidString
    ) public pure returns (bool isValid, string memory reason) {
        bytes memory cidBytes = bytes(cidString);

        // Check length (CIDv1 base32 is typically 59 characters)
        if (cidBytes.length != 59) {
            return (false, "Invalid length");
        }

        // Check prefix (CIDv1 base32 starts with 'b')
        if (cidBytes[0] != "b") {
            return (false, "Not CIDv1 base32");
        }

        // Check character set (base32 only contains a-z, 2-7)
        for (uint256 i = 1; i < cidBytes.length; i++) {
            bytes1 char = cidBytes[i];
            if (
                !((char >= "a" && char <= "z") || (char >= "2" && char <= "7"))
            ) {
                return (false, "Invalid base32 character");
            }
        }

        return (true, "Valid CID format");
    }

    /**
     * @dev Core verification function: Complete verification from json to CID string
     * @param json The json to verify
     * @param expectedCid The expected CID string
     */
    function verifyJSONToCID(
        string memory json,
        string memory expectedCid
    ) internal pure {
        require(
            keccak256(bytes(generateCID(json))) ==
                keccak256(bytes(expectedCid)),
            "Generated CID does not match expected CID string"
        );
    }

    /**
     * @dev Generate CID string for given content (for testing/debugging)
     * @param content The content to generate CID for
     * @return Generated CID string
     */
    function generateCID(
        string memory content
    ) public pure returns (string memory) {
        bytes memory contentBytes = bytes(content);
        bytes memory unixfsData = createUnixFS(contentBytes);
        bytes memory dagpbData = createDAGPB(unixfsData);
        bytes32 contentHash = sha256(dagpbData);
        bytes memory cidBytes = constructCIDv1(contentHash);
        return cidBytesToBase32String(cidBytes);
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    /**
     * @dev Convert CID bytes to base32 string
     * @param cidBytes Binary CID representation
     * @return Base32 encoded CID string
     */
    function cidBytesToBase32String(
        bytes memory cidBytes
    ) internal pure returns (string memory) {
        // CIDv1 byte format: [version][codec][hash_type][hash_length][hash_bytes]
        require(cidBytes.length == 36, "Invalid CID bytes length");
        require(cidBytes[0] == 0x01, "Not CIDv1");
        require(cidBytes[1] == 0x70, "Not dag-pb codec");
        require(cidBytes[2] == 0x12, "Not SHA-256 hash");
        require(cidBytes[3] == 0x20, "Invalid hash length");

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

    /**
     * @dev Create UnixFS file structure
     * @param data Content data
     * @return UnixFS encoded data
     */
    function createUnixFS(
        bytes memory data
    ) internal pure returns (bytes memory) {
        uint256 dataLength = data.length;
        bytes memory result = new bytes(10 + dataLength);
        uint256 pos = 0;

        // Field 1: Type = File (2)
        result[pos++] = 0x08; // field 1, varint wire type
        result[pos++] = 0x02; // value = 2 (File)

        // Field 2: Data
        result[pos++] = 0x12; // field 2, length-delimited wire type

        // Encode data length (varint)
        pos += encodeVarint(result, pos, dataLength);

        // Copy data
        for (uint256 i = 0; i < dataLength; i++) {
            result[pos + i] = data[i];
        }
        pos += dataLength;

        // Adjust result array size
        bytes memory finalResult = new bytes(pos);
        for (uint256 i = 0; i < pos; i++) {
            finalResult[i] = result[i];
        }

        return finalResult;
    }

    /**
     * @dev Create DAG-PB node
     * @param unixfsData UnixFS encoded data
     * @return DAG-PB encoded data
     */
    function createDAGPB(
        bytes memory unixfsData
    ) internal pure returns (bytes memory) {
        uint256 unixfsLength = unixfsData.length;
        bytes memory result = new bytes(10 + unixfsLength);
        uint256 pos = 0;

        // Field 1: Data (length-delimited)
        result[pos++] = 0x0A; // field 1, length-delimited wire type

        // Encode UnixFS data length
        pos += encodeVarint(result, pos, unixfsLength);

        // Copy UnixFS data
        for (uint256 i = 0; i < unixfsLength; i++) {
            result[pos + i] = unixfsData[i];
        }
        pos += unixfsLength;

        // Adjust result array size
        bytes memory finalResult = new bytes(pos);
        for (uint256 i = 0; i < pos; i++) {
            finalResult[i] = result[i];
        }

        return finalResult;
    }

    /**
     * @dev Construct CIDv1
     * @param contentHash SHA-256 hash of content
     * @return CIDv1 binary representation
     */
    function constructCIDv1(
        bytes32 contentHash
    ) internal pure returns (bytes memory) {
        bytes memory result = new bytes(36);

        result[0] = 0x01; // CIDv1
        result[1] = 0x70; // dag-pb codec
        result[2] = 0x12; // SHA-256 hash type
        result[3] = 0x20; // hash length (32 bytes)

        // Copy hash value
        for (uint256 i = 0; i < 32; i++) {
            result[4 + i] = contentHash[i];
        }

        return result;
    }

    /**
     * @dev Varint encoding function
     * @param buffer Buffer to write to
     * @param offset Starting offset
     * @param value Value to encode
     * @return Number of bytes written
     */
    function encodeVarint(
        bytes memory buffer,
        uint256 offset,
        uint256 value
    ) internal pure returns (uint256) {
        uint256 bytesWritten = 0;

        while (value >= 0x80) {
            buffer[offset + bytesWritten] = bytes1(
                uint8((value & 0x7F) | 0x80)
            );
            value >>= 7;
            bytesWritten++;
        }
        buffer[offset + bytesWritten] = bytes1(uint8(value & 0x7F));
        bytesWritten++;

        return bytesWritten;
    }
}
