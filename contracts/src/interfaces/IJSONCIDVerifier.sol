// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title IJSONCIDVerifier
 * @dev Interface for the JSONCIDVerifier contract
 */
interface IJSONCIDVerifier {
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
    ) external pure returns (bool success, string memory message);

    /**
     * @dev Generate CID string for given JSON data
     * @param json The JSON data to generate CID for
     * @return Generated CID string
     */
    function generateCIDString(
        string memory json
    ) external pure returns (string memory);

    /**
     * @dev Convert string to bytes
     * @param json The JSON string to convert
     * @return Bytes representation of the string
     */
    function getBytes(string memory json) external pure returns (bytes memory);

    /**
     * @dev Generate multihash for content
     * @param contentBytes The content bytes to hash
     * @return Multihash bytes
     */
    function getContentMultihash(
        bytes memory contentBytes
    ) external pure returns (bytes memory);

    /**
     * @dev Generate CID bytes from content hash
     * @param contentHash The content multihash
     * @return CID bytes
     */
    function getCIDBytes(
        bytes memory contentHash
    ) external pure returns (bytes memory);

    /**
     * @dev Convert CID bytes to base32 string
     * @param cidBytes Binary CID representation
     * @return Base32 encoded CID string
     */
    function getCIDString(
        bytes memory cidBytes
    ) external pure returns (string memory);

    /**
     * @dev Compare two strings for equality
     * @param a First string
     * @param b Second string
     * @return True if strings are equal
     */
    function stringEquals(
        string memory a,
        string memory b
    ) external pure returns (bool);
}
