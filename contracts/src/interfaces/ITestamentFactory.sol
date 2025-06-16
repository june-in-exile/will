// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "src/Testament.sol";

interface ITestamentFactory {
    event TestamentCreated(
        string indexed cid,
        address indexed testator,
        address testament
    );
    event CIDUploaded(string indexed cid, uint256 timestamp);
    event CIDNotarized(string indexed cid, uint256 timestamp);

    error UnauthorizedCaller(address caller, address expectedExecutor);
    error JSONCIDInvalid(string cid, string reason);
    error TestatorProofInvalid();
    error ExecutorSignatureInvalid();
    error DecryptionProofInvalid();
    error CIDNotValidatedByTestator(string cid);
    error CIDNotValidatedByExecutor(string cid);
    error TestamentAlreadyExists(string cid, address existingTestament);
    error TestamentAddressInconsistent(address predicted, address actual);

    function testatorVerifier() external view returns (address);

    function executorVerifier() external view returns (address);

    function decryptionVerifier() external view returns (address);

    function executor() external view returns (address);

    function testaments(string calldata cid) external view returns (address);

    function testatorValidateTimes(
        string calldata _cid
    ) external view returns (uint256);

    function executorValidateTimes(
        string calldata _cid
    ) external view returns (uint256);

    function predictTestament(
        address _testator,
        Testament.Estate[] calldata estates,
        uint256 _salt
    ) external view returns (address);

    function uploadCID(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        string memory _testament,
        string calldata _cid
    ) external;

    function notarizeCID(
        string calldata _cid,
        bytes memory _signature
    ) external;

    function createTestament(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        string memory _testament,
        string calldata _cid,
        address _testator,
        Testament.Estate[] calldata _estates,
        uint256 _salt
    ) external returns (address);
}
