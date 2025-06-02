// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "src/implementations/Testament.sol";

interface ITestamentFactory {
    event TestamentCreated(
        bytes32 indexed cidHash,
        address indexed testator,
        address testament
    );
    event CIDUploaded(bytes32 indexed cidHash, uint256 timestamp);
    event CIDNotarized(bytes32 indexed cidHash, uint256 timestamp);

    error UnauthorizedCaller(address caller, address expectedExecutor);
    error TestatorProofInvalid();
    error ExecutorSignatureInvalid();
    error DecryptionProofInvalid();
    error CIDNotValidatedByTestator(bytes32 cidHash);
    error CIDNotValidatedByExecutor(bytes32 cidHash);
    error TestamentAlreadyExists(bytes32 cidHash, address existingTestament);
    error TestamentAddressInconsistent(address predicted, address actual);

    function testatorVerifier() external view returns (address);

    function executorVerifier() external view returns (address);

    function decryptionVerifier() external view returns (address);

    function executor() external view returns (address);

    function testaments(bytes32 cidHash) external view returns (address);

    function testatorValidateTimes(
        bytes32 _cidHash
    ) external view returns (uint256);

    function executorValidateTimes(
        bytes32 _cidHash
    ) external view returns (uint256);

    function uploadCID(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        bytes32 _cidHash
    ) external;

    function notarizeCID(bytes32 _cidHash, bytes memory _signature) external;

    function predictTestament(
        address _testator,
        Testament.Estate[] calldata estates,
        uint256 _salt
    ) external view returns (address);

    function createTestament(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        bytes32 _cidHash,
        address _testator,
        Testament.Estate[] calldata _estates,
        uint256 _salt
    ) external returns (address);
}
