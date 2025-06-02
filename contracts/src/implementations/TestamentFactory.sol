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

    mapping(bytes32 => uint256) private _testatorValidateTimes;
    mapping(bytes32 => uint256) private _executorValidateTimes;
    mapping(bytes32 => address) public testaments;

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
        bytes32 _cidHash
    ) external view onlyAuthorized returns (uint256) {
        return _testatorValidateTimes[_cidHash];
    }

    function executorValidateTimes(
        bytes32 _cidHash
    ) external view onlyAuthorized returns (uint256) {
        return _executorValidateTimes[_cidHash];
    }

    function uploadCID(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals,
        bytes32 _cidHash
    ) external {
        if (!testatorVerifier.verifyProof(_pA, _pB, _pC, _pubSignals))
            revert TestatorProofInvalid();

        _testatorValidateTimes[_cidHash] = block.timestamp;
        emit CIDUploaded(_cidHash, block.timestamp);
    }

    function notarizeCID(bytes32 _cidHash, bytes memory _signature) external {
        if (_testatorValidateTimes[_cidHash] == 0)
            revert CIDNotValidatedByTestator(_cidHash);
        if (!executorVerifier.verifySignature(executor, _cidHash, _signature))
            revert ExecutorSignatureInvalid();

        _executorValidateTimes[_cidHash] = block.timestamp;
        emit CIDNotarized(_cidHash, block.timestamp);
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
        bytes32 _cidHash,
        address _testator,
        Testament.Estate[] calldata _estates,
        uint256 _salt
    ) external returns (address) {
        if (_testatorValidateTimes[_cidHash] == 0)
            revert CIDNotValidatedByTestator(_cidHash);
        if (
            _executorValidateTimes[_cidHash] <= _testatorValidateTimes[_cidHash]
        ) revert CIDNotValidatedByExecutor(_cidHash);
        if (!decryptionVerifier.verifyProof(_pA, _pB, _pC, _pubSignals))
            revert DecryptionProofInvalid();
        if (testaments[_cidHash] != address(0))
            revert TestamentAlreadyExists(_cidHash, testaments[_cidHash]);

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

        testaments[_cidHash] = address(testament);
        emit TestamentCreated(_cidHash, _testator, address(testament));

        return address(testament);
    }
}
