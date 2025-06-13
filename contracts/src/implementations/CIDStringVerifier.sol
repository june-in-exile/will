// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * 輔助合約：CID 字符串驗證
 * 由於 Solidity 中實現 base32 解碼較複雜，這個合約提供額外的驗證功能
 */
contract CIDStringVerifier {
    
    /**
     * 驗證 CID 字符串格式（簡化版本）
     */
    function verifyCIDStringFormat(string memory cidString) 
        external 
        pure 
        returns (bool isValid, string memory reason) 
    {
        bytes memory cidBytes = bytes(cidString);
        
        // 檢查長度 (CIDv1 base32 通常是 59 字符)
        if (cidBytes.length != 59) {
            return (false, "Invalid length");
        }
        
        // 檢查前綴 (CIDv1 base32 以 'b' 開頭)
        if (cidBytes[0] != 'b') {
            return (false, "Not CIDv1 base32");
        }
        
        // 檢查字符集 (base32 只包含 a-z, 2-7)
        for (uint256 i = 1; i < cidBytes.length; i++) {
            bytes1 char = cidBytes[i];
            if (!((char >= 'a' && char <= 'z') || (char >= '2' && char <= '7'))) {
                return (false, "Invalid base32 character");
            }
        }
        
        return (true, "Valid CID format");
    }
    
    /**
     * 提取 CID 中的哈希部分（需要完整的 base32 解碼實現）
     * 這裡提供接口，實際實現需要更複雜的 base32 解碼邏輯
     */
    function extractHashFromCID(string memory cidString) 
        external 
        pure 
        returns (bytes32) 
    {
        // 簡化實現：返回 CID 字符串的 keccak256 哈希作為識別符
        // 實際應用中需要實現完整的 base32 解碼
        return keccak256(bytes(cidString));
    }
}