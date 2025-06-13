// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {ContentToCIDVerifier} from "src/implementations/ContentToCIDVerifier.sol";
import {CIDStringVerifier} from "src/implementations/CIDStringVerifier.sol";

/**
 * 主驗證合約：結合完整驗證和字符串檢查
 */
contract CIDVerifier {
    ContentToCIDVerifier public immutable contentToCIDVerifier;
    CIDStringVerifier public immutable stringVerifier;

    constructor() {
        contentToCIDVerifier = new ContentToCIDVerifier();
        stringVerifier = new CIDStringVerifier();
    }

    /**
     * 完整的驗證流程
     */
    function verifyCID(
        string memory testament,
        string memory cid
    ) external returns (bool success, string memory message) {
        // 1. 檢查 CID 字符串格式
        (bool formatValid, string memory formatReason) = stringVerifier
            .verifyCIDStringFormat(cid);

        if (!formatValid) {
            return (
                false,
                string(abi.encodePacked("CID format error: ", formatReason))
            );
        }

        // 2. 執行完整的鏈上驗證
        try contentToCIDVerifier.verifyTestamentToCID(testament, cid) {
            return (true, "Verification successful");
        } catch Error(string memory reason) {
            return (
                false,
                string(abi.encodePacked("Verification failed: ", reason))
            );
        } catch {
            return (false, "Verification failed: Unknown error");
        }
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
        ContentToCIDVerifier.VerificationResult
            memory result = contentToCIDVerifier.getVerificationResult(
                testament
            );

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
