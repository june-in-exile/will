// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "src/Will.sol";

interface IWillFactory {
    event WillCreated(
        string indexed cid,
        address indexed testator,
        address will
    );
    event CIDUploaded(string indexed cid, uint256 timestamp);
    event CIDNotarized(string indexed cid, uint256 timestamp);

    error UnauthorizedCaller(address caller, address expectedExecutor);
    error JsonCidInvalid(string cid, string reason);
    error TestatorProofInvalid();
    error ExecutorSignatureInvalid();
    error DecryptionProofInvalid();
    error CIDNotValidatedByTestator(string cid);
    error CIDNotValidatedByExecutor(string cid);
    error WillAlreadyExists(string cid, address existingWill);
    error WillAddressInconsistent(address predicted, address actual);

    function uploadCidVerifier() external view returns (address);

    function executorVerifier() external view returns (address);

    function createWillVerifier() external view returns (address);

    function executor() external view returns (address);

    function wills(string calldata cid) external view returns (address);

    function testatorValidateTimes(
        string calldata _cid
    ) external view returns (uint256);

    function executorValidateTimes(
        string calldata _cid
    ) external view returns (uint256);

    function predictWill(
        address _testator,
        Will.Estate[] calldata estates,
        uint256 _salt
    ) external view returns (address);

    function uploadCid(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        string memory _will,
        string calldata _cid
    ) external;

    function notarizeCid(
        string calldata _cid,
        bytes memory _signature
    ) external;

    function createWill(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        string memory _will,
        string calldata _cid,
        address _testator,
        Will.Estate[] calldata _estates,
        uint256 _salt
    ) external returns (address);
}
