// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * 完整的 IPFS CID 驗證合約 - 修正版本
 * 包含從 testament 到 CID 字符串的完整驗證鏈條
 */
contract ContentToCIDVerifier {
    
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
    
    /**
     * 核心驗證函數：完整驗證 testament 到 CID 字符串
     */
    function verifyTestamentToCID(
        string memory testament,
        string memory cid
    ) external {
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
        require(bytes(cid)[0] == 'b', "CID must start with 'b' (CIDv1 base32)");
        
        // Step 6: 將生成的 CID 字節轉換為 base32 並與預期字符串比較
        string memory generatedCIDString = cidBytesToBase32String(cidBytes);
        bool stringMatches = compareStrings(generatedCIDString, cid);
        
        // 要求字符串必須匹配
        require(stringMatches, "Generated CID does not match expected CID string");
        
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
    function cidBytesToBase32String(bytes memory cidBytes) internal pure returns (string memory) {
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
    function encodeBase32(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        // IPFS base32 字母表
        bytes memory alphabet = "abcdefghijklmnopqrstuvwxyz234567";
        
        // 計算輸出長度
        uint256 outputLength = (data.length * 8 + 4) / 5;
        bytes memory result = new bytes(outputLength + 1); // +1 for multibase prefix
        
        // 添加 multibase 前綴 'b' for base32
        result[0] = 'b';
        
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
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
    
    /**
     * 創建 UnixFS 文件結構
     */
    function createUnixFS(bytes memory data) internal pure returns (bytes memory) {
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
    function createDAGPB(bytes memory unixfsData) internal pure returns (bytes memory) {
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
    function constructCIDv1(bytes32 contentHash) internal pure returns (bytes memory) {
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
            buffer[offset + bytesWritten] = bytes1(uint8((value & 0x7F) | 0x80));
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
    function getVerificationResult(string memory testament) 
        external 
        view 
        returns (VerificationResult memory) 
    {
        bytes32 testamentHash = keccak256(bytes(testament));
        return verifiedTestaments[testamentHash];
    }
    
    function isTestamentVerified(string memory testament) 
        external 
        view 
        returns (bool) 
    {
        bytes32 testamentHash = keccak256(bytes(testament));
        VerificationResult memory result = verifiedTestaments[testamentHash];
        return result.stringVerified && result.timestamp > 0;
    }
    
    /**
     * 調試函數：返回生成的 CID 字符串
     */
    function generateCIDString(string memory testament) 
        external 
        pure
        returns (string memory) 
    {
        bytes memory testamentBytes = bytes(testament);
        bytes memory unixfsData = createUnixFS(testamentBytes);
        bytes memory dagpbData = createDAGPB(unixfsData);
        bytes32 contentHash = sha256(dagpbData);
        bytes memory cidBytes = constructCIDv1(contentHash);
        return cidBytesToBase32String(cidBytes);
    }
}