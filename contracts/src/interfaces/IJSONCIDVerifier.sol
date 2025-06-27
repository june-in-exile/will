// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IJsonCidVerifier
 * @dev Interface for verifying that JSON corresponds to its IPFS CID using json codec
 */
interface IJsonCidVerifier {
    // =============================================================================
    // ERRORS
    // =============================================================================

    error LengthMismatch(uint256 keyLength, uint256 valueLength);
    error EmptyJSONObject();

    // =============================================================================
    // STRUCTS AND TYPES
    // =============================================================================

    /**
     * @dev Represents a JSON object as key-value pairs
     */
    struct JsonObject {
        string[] keys;
        string[] values;
    }

    /**
     * @dev Represents different types of JSON values
     */
    enum JsonValueType {
        STRING,
        NUMBER,
        BOOLEAN,
        NULL
    }

    /**
     * @dev Enhanced JSON value with type information
     */
    struct JsonValue {
        string value;
        JsonValueType valueType;
    }

    /**
     * @dev Enhanced JSON object with typed values
     */
    struct TypedJsonObject {
        string[] keys;
        JsonValue[] values;
    }

    // =============================================================================
    // MAIN VERIFICATION FUNCTIONS
    // =============================================================================

    /**
     * @dev Complete verification workflow for simple JSON object
     * @param jsonObj The JSON object to verify (all values treated as strings)
     * @param cid Expected CID string
     * @return success Whether verification succeeded
     */
    function verifyCID(
        JsonObject memory jsonObj,
        string memory cid
    ) external pure returns (bool success);

    /**
     * @dev Complete verification workflow for typed JSON object
     * @param jsonObj The typed JSON object to verify
     * @param cid Expected CID string
     * @return success Whether verification succeeded
     */
    function verifyCID(
        TypedJsonObject memory jsonObj,
        string memory cid
    ) external pure returns (bool success);

    // =============================================================================
    // CID GENERATION FUNCTIONS
    // =============================================================================

    /**
     * @dev Generate CID string for given JSON object
     * @param jsonObj The JSON object to generate CID for
     * @return Generated CID string
     */
    function generateCIDString(
        JsonObject memory jsonObj
    ) external pure returns (string memory);

    /**
     * @dev Generate CID string for given typed JSON object
     * @param jsonObj The typed JSON object to generate CID for
     * @return Generated CID string
     */
    function generateCIDString(
        TypedJsonObject memory jsonObj
    ) external pure returns (string memory);

    // =============================================================================
    // JSON BUILDING FUNCTIONS
    // =============================================================================

    /**
     * @dev Build standardized JSON string from JsonObject
     * @param jsonObj The JSON object structure
     * @return Standardized JSON string (no spaces, sorted keys)
     */
    function buildStandardizedJson(
        JsonObject memory jsonObj
    ) external pure returns (string memory);

    /**
     * @dev Build standardized JSON string from TypedJsonObject
     * @param jsonObj The typed JSON object structure
     * @return Standardized JSON string with proper typing
     */
    function buildStandardizedJson(
        TypedJsonObject memory jsonObj
    ) external pure returns (string memory);

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    /**
     * @dev Convert JSON string to bytes
     * @param json The JSON string
     * @return JSON as bytes
     */
    function getJsonBytes(
        string memory json
    ) external pure returns (bytes memory);

    /**
     * @dev Generate multihash from JSON bytes
     * @param jsonBytes The JSON bytes
     * @return Multihash bytes
     */
    function getMultihash(
        bytes memory jsonBytes
    ) external pure returns (bytes memory);

    /**
     * @dev Generate CID bytes from multihash
     * @param multihash The multihash bytes
     * @return CID bytes
     */
    function getCIDBytes(
        bytes memory multihash
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
     * @return Whether strings are equal
     */
    function stringEquals(
        string memory a,
        string memory b
    ) external pure returns (bool);
}
