// SPDX-License-Identifier: MIT
// deprecated

pragma solidity ^0.8.20;

interface ITestamentFactory {
    /// @notice verify ZKP and store encrypted testament
    /// @param zkp zero-knowledge proof
    /// @param _data the encrypted testament to be stored
    /// @return testator_id The testator's id
    function uploadTestament(bytes[] calldata zkp, bytes calldata _data) external returns (uint256);

    /// @notice verify the court's signature and validate the encrypted testament
    /// @param _signature the signature from the court
    /// @return isValid The verification result
    function validateTestament(bytes calldata _signature) external returns (bool);

    /// @notice get the encrypted testament
    /// @param testator_id The testator's id
    /// @return _data the encrypted testament
    function getTestament(uint256 testator_id) external returns (bytes memory);

    /// @notice verify ZKP and deploy the testemant contract
    /// @param zkp zero-knowledge proof
    /// @param params the parameters for deployment
    function createTestament(bytes[] calldata zkp, bytes calldata params) external;

    /// @notice execute the testament contract
    /// @param testator_id The testator's id
    function executeTestament(uint256 testator_id) external;
}
