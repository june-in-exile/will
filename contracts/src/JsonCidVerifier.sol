// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title JsonCidVerifier
 * @dev A contract for verifying that JSON corresponds to its IPFS CID using json codec
 * @notice This contract verifies JSON against its IPFS CID v1 representation with json codec
 */
contract JsonCidVerifier {
    error LengthMismatch(uint256 keyLength, uint256 valueLength);
    error EmptyJSONObject();

    struct JsonObject {
        string[] keys;
        string[] values;
    }

    enum JsonValueType {
        STRING,
        NUMBER,
        BOOLEAN,
        NULL
    }

    struct JsonValue {
        string value;
        JsonValueType valueType;
    }

    struct TypedJsonObject {
        string[] keys;
        JsonValue[] values;
    }

    constructor() { }

    function verifyCid(JsonObject memory jsonObj, string memory cid) external pure returns (bool) {
        return stringEquals(generateCidString(jsonObj), cid);
    }

    function verifyCid(TypedJsonObject memory typedJsonObj, string memory cid) external pure returns (bool) {
        return stringEquals(generateCidString(typedJsonObj), cid);
    }

    function generateCidString(JsonObject memory jsonObj) public pure returns (string memory) {
        string memory json = buildStandardizedJson(jsonObj);
        return _generateCidString(json);
    }

    function generateCidString(TypedJsonObject memory typedJsonObj) public pure returns (string memory) {
        string memory json = buildStandardizedJson(typedJsonObj);
        return _generateCidString(json);
    }

    function _generateCidString(string memory json) internal pure returns (string memory) {
        bytes memory jsonBytes = getJsonBytes(json);
        bytes memory multihash = getMultihash(jsonBytes);
        bytes memory cidBytes = getCidBytes(multihash);
        return getCidString(cidBytes);
    }

    function buildStandardizedJson(JsonObject memory jsonObj) public pure returns (string memory) {
        if (jsonObj.keys.length != jsonObj.values.length) {
            revert LengthMismatch(jsonObj.keys.length, jsonObj.values.length);
        }
        if (jsonObj.keys.length == 0) revert EmptyJSONObject();

        string memory json = "{";

        for (uint256 i = 0; i < jsonObj.keys.length; i++) {
            if (i > 0) {
                json = string.concat(json, ",");
            }

            json = string.concat(json, '"', jsonObj.keys[i], '":"', jsonObj.values[i], '"');
        }

        json = string.concat(json, "}");
        return json;
    }

    function buildStandardizedJson(TypedJsonObject memory typedJsonObj) public pure returns (string memory) {
        if (typedJsonObj.keys.length != typedJsonObj.values.length) {
            revert LengthMismatch(typedJsonObj.keys.length, typedJsonObj.values.length);
        }
        if (typedJsonObj.keys.length == 0) revert EmptyJSONObject();

        string memory json = "{";

        for (uint256 i = 0; i < typedJsonObj.keys.length; i++) {
            if (i > 0) {
                json = string.concat(json, ",");
            }

            json = string.concat(json, '"', typedJsonObj.keys[i], '":');

            JsonValue memory val = typedJsonObj.values[i];

            if (val.valueType == JsonValueType.STRING) {
                json = string.concat(json, '"', val.value, '"');
            } else if (val.valueType == JsonValueType.NUMBER) {
                json = string.concat(json, val.value);
            } else if (val.valueType == JsonValueType.BOOLEAN) {
                json = string.concat(json, val.value); // "true" or "false"
            } else if (val.valueType == JsonValueType.NULL) {
                json = string.concat(json, "null");
            }
        }

        json = string.concat(json, "}");
        return json;
    }

    function getJsonBytes(string memory json) public pure returns (bytes memory) {
        return bytes(json);
    }

    function getMultihash(bytes memory jsonBytes) public pure returns (bytes memory) {
        bytes32 rawHash = sha256(jsonBytes);
        bytes memory multihash = new bytes(34); // 2 bytes prefix + 32 bytes hash

        multihash[0] = 0x12; // SHA-256 hash type
        multihash[1] = 0x20; // Hash length (32 bytes)

        // Copy the 32-byte hash
        for (uint256 i = 0; i < 32; i++) {
            multihash[2 + i] = rawHash[i];
        }

        return multihash;
    }

    function getCidBytes(bytes memory multihash) public pure returns (bytes memory) {
        bytes memory result = new bytes(37);

        result[0] = 0x01; // CIDv1
        result[1] = 0x80; // json codec (0x0200 in varint is 0x80 0x04)
        result[2] = 0x04; // json codec second byte

        // Copy hash value
        for (uint256 i = 0; i < 34; i++) {
            result[3 + i] = multihash[i];
        }

        return result;
    }

    function getCidString(bytes memory cidBytes) public pure returns (string memory) {
        // CIDv1 byte format: [version][codec][hash_type][hash_length][hash_bytes]
        require(cidBytes.length == 37, "Invalid CID bytes length for json codec");
        require(cidBytes[0] == 0x01, "Not CIDv1");
        require(cidBytes[1] == 0x80, "Not Varint-encoded json codec (first byte)");
        require(cidBytes[2] == 0x04, "Not Varint-encoded json codec (second byte)");
        require(cidBytes[3] == 0x12, "Not SHA-256 hash");
        require(cidBytes[4] == 0x20, "Invalid hash length");

        return encodeBase32(cidBytes);
    }

    function encodeBase32(bytes memory data) internal pure returns (string memory) {
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

    function stringEquals(string memory a, string memory b) public pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}
