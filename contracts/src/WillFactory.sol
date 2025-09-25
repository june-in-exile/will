// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { CidUploadVerifier } from "src/CidUploadVerifier.sol";
import { WillCreationVerifier } from "src/WillCreationVerifier.sol";
import { JsonCidVerifier } from "src/JsonCidVerifier.sol";
import { Will } from "src/Will.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract WillFactory {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    CidUploadVerifier public cidUploadVerifier;
    WillCreationVerifier public willCreateVerifier;
    JsonCidVerifier public jsonCidVerifier;
    address public permit2;
    address public notary;
    address public executor;

    mapping(string => uint256) private _testatorValidateTimes;
    mapping(string => uint256) private _executorValidateTimes;
    mapping(string => address) public wills;

    event CidUploaded(string indexed cid, uint256 timestamp);
    event CidNotarized(string indexed cid, uint256 timestamp);
    event WillCreated(string indexed cid, address indexed testator, address will);

    error UnauthorizedCaller(address caller, address expectedCaller);
    
    error AlreadyUploaded(string cid);
    error AlreadyNotarized(string cid);

    error CidNotValidatedByTestator(string cid);
    error CidNotValidatedByExecutor(string cid);

    error JsonCidInvalid(string cid);
    error CidUploadProofInvalid();
    error SignatureInvalid(string _cid, bytes _signature, address signer);
    error WillCreationProofInvalid();

    error WillAlreadyExists(string cid, address existingWill);
    error WillAddressInconsistent(address predicted, address actual);

    constructor(
        address _cidUploadVerifier,
        address _willCreateVerifier,
        address _jsonCidVerifier,
        address _notary,
        address _executor,
        address _permit2
    ) {
        cidUploadVerifier = CidUploadVerifier(_cidUploadVerifier);
        willCreateVerifier = WillCreationVerifier(_willCreateVerifier);
        jsonCidVerifier = JsonCidVerifier(_jsonCidVerifier);
        notary = _notary;
        executor = _executor;
        permit2 = _permit2;
    }

    modifier onlyAuthorized() {
        if (msg.sender != executor) revert UnauthorizedCaller(msg.sender, executor);
        _;
    }

    function testatorValidateTimes(string calldata _cid) external view onlyAuthorized returns (uint256) {
        return _testatorValidateTimes[_cid];
    }

    function executorValidateTimes(string calldata _cid) external view onlyAuthorized returns (uint256) {
        return _executorValidateTimes[_cid];
    }

    function _recoverSigner(string calldata message, bytes memory signature) internal pure returns (address) {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        return ethSignedMessageHash.recover(signature);
    }

    function _verifySignature(string calldata message, bytes memory signature, address expectedSigner) internal pure returns (bool) {
        address signer = _recoverSigner(message, signature);
        return (signer == expectedSigner);
    }

    function verifySignature(string calldata message, bytes memory signature, address expectedSigner) external pure returns (bool) {
        return _verifySignature(message, signature, expectedSigner);
    }

    function _predictWill(address _testator, Will.Estate[] calldata estates, uint256 _salt)
        internal
        view
        returns (address)
    {
        bytes memory bytecode =
            abi.encodePacked(type(Will).creationCode, abi.encode(permit2, _testator, executor, estates));

        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), _salt, keccak256(bytecode)));

        return address(uint160(uint256(hash)));
    }

    function predictWill(address _testator, Will.Estate[] calldata estates, uint256 _salt)
        external
        view
        returns (address)
    {
        return _predictWill(_testator, estates, _salt);
    }

    function uploadCid(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[285] calldata _pubSignals,
        JsonCidVerifier.TypedJsonObject memory _will,
        string calldata _cid
    ) external {
        if (_testatorValidateTimes[_cid] > 0) revert AlreadyUploaded(_cid);

        if (!jsonCidVerifier.verifyCid(_will, _cid)) revert JsonCidInvalid(_cid);

        if (!cidUploadVerifier.verifyProof(_pA, _pB, _pC, _pubSignals)) revert CidUploadProofInvalid();

        // @todo should check if the testator in pubSignals is the msg.sender

        _testatorValidateTimes[_cid] = block.timestamp;
        emit CidUploaded(_cid, block.timestamp);
    }

    function notarizeCid(string calldata _cid, bytes memory _signature) external onlyAuthorized {
        if (_testatorValidateTimes[_cid] == 0 || _testatorValidateTimes[_cid] >= block.timestamp) revert CidNotValidatedByTestator(_cid);

        if (_executorValidateTimes[_cid] > _testatorValidateTimes[_cid]) revert AlreadyNotarized(_cid);

        if (!_verifySignature(_cid, _signature, notary)) revert SignatureInvalid(_cid, _signature, notary);

        _executorValidateTimes[_cid] = block.timestamp;
        emit CidNotarized(_cid, block.timestamp);
    }

    function createWill(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[292] calldata _pubSignals,
        JsonCidVerifier.TypedJsonObject memory _will,
        string calldata _cid,
        address _testator,
        Will.Estate[] calldata _estates,
        uint256 _salt
    ) external onlyAuthorized returns (address) {
        if (_testatorValidateTimes[_cid] == 0) revert CidNotValidatedByTestator(_cid);
        if (_executorValidateTimes[_cid] <= _testatorValidateTimes[_cid]) revert CidNotValidatedByExecutor(_cid);

        if (!jsonCidVerifier.verifyCid(_will, _cid)) revert JsonCidInvalid(_cid);

        // @todo should check if (testator,estates) in pubSignals is the same as in pubSignals
        if (!willCreateVerifier.verifyProof(_pA, _pB, _pC, _pubSignals)) revert WillCreationProofInvalid();
        if (wills[_cid] != address(0)) revert WillAlreadyExists(_cid, wills[_cid]);

        Will will = new Will{ salt: bytes32(_salt) }(permit2, _testator, executor, _estates);
        address predictedAddress = _predictWill(_testator, _estates, _salt);
        if (address(will) != predictedAddress) revert WillAddressInconsistent(predictedAddress, address(will));

        wills[_cid] = address(will);
        emit WillCreated(_cid, _testator, address(will));

        return address(will);
    }
}
