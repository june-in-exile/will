// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "src/implementations/Testament.sol";
import "src/implementations/Groth16Verifier.sol";
import "src/implementations/ECDSAVerifier.sol";

contract TestamentFactory {
    Groth16Verifier public testatorVerifier;
    ECDSAVerifier public executorVerifier;
    Groth16Verifier public decryptionVerifier;
    address public executor;

    mapping(string => uint256) private _testatorValidateTimes;
    mapping(string => uint256) private _executorValidateTimes;
    mapping(string => address) public testaments;

    event TestamentCreated(
        string indexed cid,
        address indexed testator,
        address testament
    );
    event CIDUploaded(string indexed cid, uint256 timestamp);
    event CIDNotarized(string indexed cid, uint256 timestamp);

    error UnauthorizedCaller(address caller, address expectedExecutor);
    error TestatorProofInvalid();
    error ExecutorSignatureInvalid();
    error DecryptionProofInvalid();
    error CIDNotValidatedByTestator(string cid);
    error CIDNotValidatedByExecutor(string cid);
    error TestamentAlreadyExists(string cid, address existingTestament);
    error TestamentAddressInconsistent(address predicted, address actual);

    constructor(
        address _testatorVerifier,
        address _executorVerifier,
        address _decryptionVerifier,
        address _executor
    ) {
        testatorVerifier = Groth16Verifier(_testatorVerifier);
        executorVerifier = ECDSAVerifier(_executorVerifier);
        decryptionVerifier = Groth16Verifier(_decryptionVerifier);
        executor = _executor;
    }

    modifier onlyAuthorized() {
        if (msg.sender != executor)
            revert UnauthorizedCaller(msg.sender, executor);
        _;
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

    function uploadCID(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        string calldata _cid
    ) external {
        if (!testatorVerifier.verifyProof(_pA, _pB, _pC, _pubSignals))
            revert TestatorProofInvalid();

        _testatorValidateTimes[_cid] = block.timestamp;
        emit CIDUploaded(_cid, block.timestamp);
    }

    function notarizeCID(string calldata _cid, bytes memory _signature) external {
        if (_testatorValidateTimes[_cid] == 0)
            revert CIDNotValidatedByTestator(_cid);
        
        bytes32 cidHash = keccak256(abi.encodePacked(_cid));
        if (!executorVerifier.verifySignature(executor, cidHash, _signature))
            revert ExecutorSignatureInvalid();

        _executorValidateTimes[_cid] = block.timestamp;
        emit CIDNotarized(_cid, block.timestamp);
    }

    function predictTestament(
        address _testator,
        Testament.Estate[] calldata estates,
        uint256 _salt
    ) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(Testament).creationCode,
            abi.encode(_testator, executor, estates)
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

    function createTestament(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        string calldata _cid,
        address _testator,
        Testament.Estate[] calldata _estates,
        uint256 _salt
    ) external returns (address) {
        if (_testatorValidateTimes[_cid] == 0)
            revert CIDNotValidatedByTestator(_cid);
        if (
            _executorValidateTimes[_cid] <= _testatorValidateTimes[_cid]
        ) revert CIDNotValidatedByExecutor(_cid);
        if (!decryptionVerifier.verifyProof(_pA, _pB, _pC, _pubSignals))
            revert DecryptionProofInvalid();
        if (testaments[_cid] != address(0))
            revert TestamentAlreadyExists(_cid, testaments[_cid]);

        Testament testament = new Testament{salt: bytes32(_salt)}(
            _testator,
            executor,
            _estates
        );
        address predictedAddress = predictTestament(_testator, _estates, _salt);
        if (address(testament) != predictedAddress)
            revert TestamentAddressInconsistent(
                predictedAddress,
                address(testament)
            );

        testaments[_cid] = address(testament);
        emit TestamentCreated(_cid, _testator, address(testament));

        return address(testament);
    }
}