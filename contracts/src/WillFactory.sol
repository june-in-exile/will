// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "src/Will.sol";
import "src/Groth16Verifier.sol";
import "src/JsonCidVerifier.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract WillFactory {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    Groth16Verifier public uploadCidVerifier;
    Groth16Verifier public createWillVerifier;
    JsonCidVerifier public jsonCidVerifier;
    address public permit2;
    address public executor;

    mapping(string => uint256) private _testatorValidateTimes;
    mapping(string => uint256) private _executorValidateTimes;
    mapping(string => address) public wills;

    event WillCreated(
        string indexed cid,
        address indexed testator,
        address will
    );
    event CIDUploaded(string indexed cid, uint256 timestamp);
    event CIDNotarized(string indexed cid, uint256 timestamp);

    error UnauthorizedCaller(address caller, address expectedExecutor);
    error JsonCidInvalid(string cid);
    error TestatorProofInvalid();
    error ExecutorSignatureInvalid();
    error DecryptionProofInvalid();
    error CIDNotValidatedByTestator(string cid);
    error CIDNotValidatedByExecutor(string cid);
    error WillAlreadyExists(string cid, address existingWill);
    error WillAddressInconsistent(address predicted, address actual);

    constructor(
        address _uploadCidVerifier,
        address _createWillVerifier,
        address _jsonCidVerifier,
        address _executor,
        address _permit2
    ) {
        uploadCidVerifier = Groth16Verifier(_uploadCidVerifier);
        createWillVerifier = Groth16Verifier(_createWillVerifier);
        jsonCidVerifier = JsonCidVerifier(_jsonCidVerifier);
        executor = _executor;
        permit2 = _permit2;
    }

    modifier onlyAuthorized() {
        if (msg.sender != executor)
            revert UnauthorizedCaller(msg.sender, executor);
        _;
    }

    function verifyExecutorSignature(
        string calldata message,
        bytes memory signature
    ) external view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == executor;
    }

    function testatorValidateTimes(
        string calldata _cid
    ) external view onlyAuthorized returns (uint256) {
        return _testatorValidateTimes[_cid];
    }

    function executorValidateTimes(
        string calldata _cid
    ) external view onlyAuthorized returns (uint256) {
        return _executorValidateTimes[_cid];
    }

    function uploadCid(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        JsonCidVerifier.JsonObject memory _will,
        string calldata _cid
    ) external {
        bool isValid = jsonCidVerifier.verifyCID(_will, _cid);

        if (!isValid) revert JsonCidInvalid(_cid);

        if (!uploadCidVerifier.verifyProof(_pA, _pB, _pC, _pubSignals))
            revert TestatorProofInvalid();

        _testatorValidateTimes[_cid] = block.timestamp;
        emit CIDUploaded(_cid, block.timestamp);
    }

    function notarizeCid(
        string calldata _cid,
        bytes memory _signature
    ) external {
        if (_testatorValidateTimes[_cid] == 0)
            revert CIDNotValidatedByTestator(_cid);

        bool isValidSignature;
        try this.verifyExecutorSignature(_cid, _signature) returns (
            bool result
        ) {
            isValidSignature = result;
        } catch {
            isValidSignature = false;
        }
        if (!isValidSignature) revert ExecutorSignatureInvalid();

        _executorValidateTimes[_cid] = block.timestamp;
        emit CIDNotarized(_cid, block.timestamp);
    }

    function predictWill(
        address _testator,
        Will.Estate[] calldata estates,
        uint256 _salt
    ) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(Will).creationCode,
            abi.encode(permit2, _testator, executor, estates)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                _salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }

    function createWill(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        JsonCidVerifier.JsonObject memory _will,
        string calldata _cid,
        address _testator,
        Will.Estate[] calldata _estates,
        uint256 _salt
    ) external returns (address) {
        if (_testatorValidateTimes[_cid] == 0)
            revert CIDNotValidatedByTestator(_cid);
        if (_executorValidateTimes[_cid] <= _testatorValidateTimes[_cid])
            revert CIDNotValidatedByExecutor(_cid);

        bool isValid = jsonCidVerifier.verifyCID(_will, _cid);

        if (!isValid) revert JsonCidInvalid(_cid);
        if (!createWillVerifier.verifyProof(_pA, _pB, _pC, _pubSignals))
            revert DecryptionProofInvalid();
        if (wills[_cid] != address(0))
            revert WillAlreadyExists(_cid, wills[_cid]);

        Will will = new Will{salt: bytes32(_salt)}(
            permit2,
            _testator,
            executor,
            _estates
        );
        address predictedAddress = predictWill(_testator, _estates, _salt);
        if (address(will) != predictedAddress)
            revert WillAddressInconsistent(predictedAddress, address(will));

        wills[_cid] = address(will);
        emit WillCreated(_cid, _testator, address(will));

        return address(will);
    }
}
