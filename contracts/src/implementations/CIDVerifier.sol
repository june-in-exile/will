// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * 主驗證合約：結合完整驗證和字符串檢查
 */
contract CIDVerifier {
    // ContentToCIDVerifier public immutable contentToCIDVerifier;
    // CIDStringVerifier public immutable stringVerifier;

    event TestamentVerified(
        string testament,
        bytes32 indexed testamentHash,
        bytes32 contentHash,
        bytes cidBytes,
        string cidString,
        bool stringMatchVerified
    );

    struct VerificationResult {
        bytes32 testamentHash;
        bytes32 contentHash;
        bytes cidBytes;
        string cidString;
        bool stringVerified;
        uint256 timestamp;
        address verifier;
    }

    mapping(bytes32 => VerificationResult) public verifiedTestaments;

    constructor() {}

    /**
     * 核心驗證函數：完整驗證 testament 到 CID 字符串
     */
    function verifyTestamentToCID(
        string memory testament,
        string memory cid
    ) public {
        bytes memory testamentBytes = bytes(testament);

        // Step 1: 創建 UnixFS 結構
        bytes memory unixfsData = createUnixFS(testamentBytes);

        // Step 2: 創建 DAG-PB 節點
        bytes memory dagpbData = createDAGPB(unixfsData);

        // Step 3: 計算 SHA-256 哈希
        bytes32 contentHash = sha256(dagpbData);

        // Step 4: 構造 CIDv1 二進制格式
        bytes memory cidBytes = constructCIDv1(contentHash);

        // Step 5: 驗證 CID 字符串格式
        require(bytes(cid).length == 59, "CID string length must be 59");
        require(bytes(cid)[0] == "b", "CID must start with 'b' (CIDv1 base32)");

        // Step 6: 將生成的 CID 字節轉換為 base32 並與預期字符串比較
        string memory generatedCIDString = cidBytesToBase32String(cidBytes);
        bool stringMatches = compareStrings(generatedCIDString, cid);

        // 要求字符串必須匹配
        require(
            stringMatches,
            "Generated CID does not match expected CID string"
        );

        // 記錄驗證結果
        bytes32 testamentHash = keccak256(testamentBytes);
        verifiedTestaments[testamentHash] = VerificationResult({
            testamentHash: testamentHash,
            contentHash: contentHash,
            cidBytes: cidBytes,
            cidString: cid,
            stringVerified: stringMatches,
            timestamp: block.timestamp,
            verifier: msg.sender
        });

        emit TestamentVerified(
            testament,
            testamentHash,
            contentHash,
            cidBytes,
            cid,
            stringMatches
        );
    }

    /**
     * 將 CID 字節轉換為 base32 字符串
     * 這是關鍵的驗證步驟
     */
    function cidBytesToBase32String(
        bytes memory cidBytes
    ) internal pure returns (string memory) {
        // CIDv1 字節格式: [version][codec][hash_type][hash_length][hash_bytes]
        require(cidBytes.length == 36, "Invalid CID bytes length");
        require(cidBytes[0] == 0x01, "Not CIDv1");
        require(cidBytes[1] == 0x70, "Not dag-pb codec");
        require(cidBytes[2] == 0x12, "Not SHA-256 hash");
        require(cidBytes[3] == 0x20, "Invalid hash length");

        // 執行 base32 編碼
        return encodeBase32(cidBytes);
    }

    /**
     * Base32 編碼實現
     * 使用 IPFS 標準的 base32 字母表: abcdefghijklmnopqrstuvwxyz234567
     */
    function encodeBase32(
        bytes memory data
    ) internal pure returns (string memory) {
        if (data.length == 0) return "";

        // IPFS base32 字母表
        bytes memory alphabet = "abcdefghijklmnopqrstuvwxyz234567";

        // 計算輸出長度
        uint256 outputLength = (data.length * 8 + 4) / 5;
        bytes memory result = new bytes(outputLength + 1); // +1 for multibase prefix

        // 添加 multibase 前綴 'b' for base32
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

        // 調整結果長度
        bytes memory finalResult = new bytes(outputIndex);
        for (uint256 i = 0; i < outputIndex; i++) {
            finalResult[i] = result[i];
        }

        return string(finalResult);
    }

    /**
     * 字符串比較函數
     */
    function compareStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    /**
     * 創建 UnixFS 文件結構
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

        // 編碼數據長度 (varint)
        pos += encodeVarint(result, pos, dataLength);

        // 複製數據
        for (uint256 i = 0; i < dataLength; i++) {
            result[pos + i] = data[i];
        }
        pos += dataLength;

        // 調整結果數組大小
        bytes memory finalResult = new bytes(pos);
        for (uint256 i = 0; i < pos; i++) {
            finalResult[i] = result[i];
        }

        return finalResult;
    }

    /**
     * 創建 DAG-PB 節點
     */
    function createDAGPB(
        bytes memory unixfsData
    ) internal pure returns (bytes memory) {
        uint256 unixfsLength = unixfsData.length;
        bytes memory result = new bytes(10 + unixfsLength);
        uint256 pos = 0;

        // Field 1: Data (length-delimited)
        result[pos++] = 0x0A; // field 1, length-delimited wire type

        // 編碼 UnixFS 數據長度
        pos += encodeVarint(result, pos, unixfsLength);

        // 複製 UnixFS 數據
        for (uint256 i = 0; i < unixfsLength; i++) {
            result[pos + i] = unixfsData[i];
        }
        pos += unixfsLength;

        // 調整結果數組大小
        bytes memory finalResult = new bytes(pos);
        for (uint256 i = 0; i < pos; i++) {
            finalResult[i] = result[i];
        }

        return finalResult;
    }

    /**
     * 構造 CIDv1
     */
    function constructCIDv1(
        bytes32 contentHash
    ) internal pure returns (bytes memory) {
        bytes memory result = new bytes(36);

        result[0] = 0x01; // CIDv1
        result[1] = 0x70; // dag-pb codec
        result[2] = 0x12; // SHA-256 hash type
        result[3] = 0x20; // hash length (32 bytes)

        // 複製哈希值
        for (uint256 i = 0; i < 32; i++) {
            result[4 + i] = contentHash[i];
        }

        return result;
    }

    /**
     * Varint 編碼函數
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

    /**
     * 查詢函數
     */
    function getVerificationResult(
        string memory testament
    ) public view returns (VerificationResult memory) {
        bytes32 testamentHash = keccak256(bytes(testament));
        return verifiedTestaments[testamentHash];
    }

    function isTestamentVerified(
        string memory testament
    ) external view returns (bool) {
        bytes32 testamentHash = keccak256(bytes(testament));
        VerificationResult memory result = verifiedTestaments[testamentHash];
        return result.stringVerified && result.timestamp > 0;
    }

    /**
     * 調試函數：返回生成的 CID 字符串
     */
    function generateCIDString(
        string memory testament
    ) external pure returns (string memory) {
        bytes memory testamentBytes = bytes(testament);
        bytes memory unixfsData = createUnixFS(testamentBytes);
        bytes memory dagpbData = createDAGPB(unixfsData);
        bytes32 contentHash = sha256(dagpbData);
        bytes memory cidBytes = constructCIDv1(contentHash);
        return cidBytesToBase32String(cidBytes);
    }

    /**
     * 驗證 CID 字符串格式（簡化版本）
     */
    function verifyCIDStringFormat(
        string memory cidString
    ) public pure returns (bool isValid, string memory reason) {
        bytes memory cidBytes = bytes(cidString);

        // 檢查長度 (CIDv1 base32 通常是 59 字符)
        if (cidBytes.length != 59) {
            return (false, "Invalid length");
        }

        // 檢查前綴 (CIDv1 base32 以 'b' 開頭)
        if (cidBytes[0] != "b") {
            return (false, "Not CIDv1 base32");
        }

        // 檢查字符集 (base32 只包含 a-z, 2-7)
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
     * 提取 CID 中的哈希部分（需要完整的 base32 解碼實現）
     * 這裡提供接口，實際實現需要更複雜的 base32 解碼邏輯
     */
    function extractHashFromCID(
        string memory cidString
    ) external pure returns (bytes32) {
        // 簡化實現：返回 CID 字符串的 keccak256 哈希作為識別符
        // 實際應用中需要實現完整的 base32 解碼
        return keccak256(bytes(cidString));
    }

    /**
     * 完整的驗證流程
     */
    function verifyCID(
        string memory testament,
        string memory cid
    ) external returns (bool success, string memory message) {
        // 1. 檢查 CID 字符串格式
        (bool formatValid, string memory formatReason) = verifyCIDStringFormat(
            cid
        );

        if (!formatValid) {
            return (
                false,
                string(abi.encodePacked("CID format error: ", formatReason))
            );
        }

        // 2. 執行完整的鏈上驗證
        verifyTestamentToCID(testament, cid);
        return (true, "Verification successful");
    }

    /**
     * 查詢驗證狀態
     */
    function getVerificationStatus(
        string memory testament
    )
        external
        view
        returns (
            bytes32 testamentHash,
            bytes32 contentHash,
            bytes memory cidBytes,
            string memory cidString,
            bool stringVerified,
            uint256 timestamp,
            address verifier
        )
    {
        VerificationResult memory result = getVerificationResult(testament);

        return (
            result.testamentHash,
            result.contentHash,
            result.cidBytes,
            result.cidString,
            result.stringVerified,
            result.timestamp,
            result.verifier
        );
    }
}
