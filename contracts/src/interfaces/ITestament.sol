// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface ITestament {
    /**
     * @dev 表示遺產的資料結構
     */
    struct Estate {
        address beneficiary;
        address token;
        uint256 amount;
    }

    /**
     * @dev 當遺囑執行時觸發的事件
     */
    event testamentExecuted();

    /**
     * @dev 獲取 Permit2 合約的地址
     * @return Permit2 合約的地址
     */
    function permit2() external view returns (address);

    /**
     * @dev 獲取遺囑立遺人的地址
     * @return 立遺人的地址
     */
    function testator() external view returns (address);

    /**
     * @dev 獲取遺囑執行人的地址
     * @return 執行人的地址
     */
    function executor() external view returns (address);

    /**
     * @dev 獲取指定索引的遺產資訊
     * @param index 遺產的索引
     * @return 遺產結構體，包含受益人地址、代幣地址和金額
     */
    function estates(uint256 index) external view returns (address, address, uint256);

    /**
     * @dev 檢查遺囑是否已執行
     * @return 如果遺囑已執行則返回 true，否則返回 false
     */
    function executed() external view returns (bool);

    /**
     * @dev 通過簽名執行遺囑，將代幣轉移給受益人
     * @param nonce 用於防止重放攻擊的隨機數
     * @param deadline 簽名的有效期限
     * @param signature 立遺人的簽名，授權轉移代幣
     */
    function signatureTransferToBeneficiaries(uint256 nonce, uint256 deadline, bytes calldata signature) external;
}
