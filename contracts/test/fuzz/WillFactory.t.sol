// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "src/CidUploadVerifier.sol";
import "src/WillCreationVerifier.sol";
import "mock/MockContracts.sol";
import "helpers/TestHelpers.sol";

/*
 * @note Prerequisite for this test:
 *  1. `make fork` a virtual env
 *  2. `make deploy` necessary contracts
 *  3. `make all` in apps/backend to generate test data (e.g., encrypted will, ZKP).
 */
contract WillFactoryFuzzTest is TestHelpers {

    WillFactory factory;
    MockCidUploadVerifier mockCidUploadVerifier;
    MockWillCreationVerifier mockWillCreationVerifier;
    MockJsonCidVerifier mockJsonCidVerifier;

    // uint256 notaryPrivateKey = 0x1111111111111111111111111111111111111111111111111111111111111111;
    // uint256 oraclePrivateKey = 0x2222222222222222222222222222222222222222222222222222222222222222;
    address notary = makeAddr("notary");
    address oracle = makeAddr("oracle");
    address executor = makeAddr("executor");
    address permit2 = makeAddr("permit2");
    uint8 maxEstates = 2;

    JsonCidVerifier.TypedJsonObject willJson;
    CidUploadProofData cidUploadProof = _getCidUploadProofFromFiles();
    WillCreationProofData willCreationProof = _getWillCreationProofFromFiles();

    function setUp() public {
        // notary = vm.addr(notaryPrivateKey);
        // oracle = vm.addr(oraclePrivateKey);

        mockCidUploadVerifier = new MockCidUploadVerifier();
        mockWillCreationVerifier = new MockWillCreationVerifier();
        mockJsonCidVerifier = new MockJsonCidVerifier();

        factory = new WillFactory(
            address(mockCidUploadVerifier),
            address(mockWillCreationVerifier),
            address(mockJsonCidVerifier),
            notary,
            oracle,
            permit2,
            maxEstates
        );

        willJson = _getEncryptedWillFromFile();
        cidUploadProof = _getCidUploadProofFromFiles();
        willCreationProof = _getWillCreationProofFromFiles();
    }

    function test_PredictWill_DeterministicOutput(
        address testator,
        uint256 salt,
        address token,
        uint256 amount,
        address beneficiary
    ) public view {
        vm.assume(testator != address(0));
        vm.assume(beneficiary != address(0));
        vm.assume(token != address(0));

        Will.Estate[] memory estates = new Will.Estate[](1);
        estates[0] = Will.Estate({ token: token, amount: amount, beneficiary: beneficiary });

        address predicted1 = factory.predictWill(testator, executor, estates, salt);
        address predicted2 = factory.predictWill(testator, executor, estates, salt);

        assertEq(predicted1, predicted2);
    }

    function test_PredictWill_DifferentSalts(
        address testator,
        uint256 salt1,
        uint256 salt2,
        address token,
        uint256 amount,
        address beneficiary
    ) public view {
        vm.assume(testator != address(0));
        vm.assume(beneficiary != address(0));
        vm.assume(token != address(0));
        vm.assume(salt1 != salt2);

        Will.Estate[] memory estates = new Will.Estate[](1);
        estates[0] = Will.Estate({ token: token, amount: amount, beneficiary: beneficiary });

        address predicted1 = factory.predictWill(testator, executor, estates, salt1);
        address predicted2 = factory.predictWill(testator, executor, estates, salt2);

        assertTrue(predicted1 != predicted2);
    }

    function test_UploadCid_RevertOnWrongCiphertext(uint256 seed) public {
        vm.assume(seed < type(uint256).max - 1000); // Prevent overflow
        
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockCidUploadVerifier.setShouldReturnTrue(true);

        address testator = address(uint160(cidUploadProof.pubSignals[0]));

        // Create a modified will JSON with wrong ciphertext
        JsonCidVerifier.TypedJsonObject memory modifiedWill = willJson;
        // Store original value and ensure we modify it to something different
        require(modifiedWill.values[3].numberArray.length > 0, "Ciphertext array is empty");
        uint256 originalValue = modifiedWill.values[3].numberArray[0];
        // Ensure the new value is different from the original
        vm.assume(seed != originalValue);
        modifiedWill.values[3].numberArray[0] = seed;

        vm.prank(testator);
        vm.expectRevert(WillFactory.WrongCiphertext.selector);
        factory.uploadCid(
            cidUploadProof.pA,
            cidUploadProof.pB,
            cidUploadProof.pC,
            cidUploadProof.pubSignals,
            modifiedWill,
            "test_cid"
        );
    }

    function test_UploadCid_RevertOnWrongInitializationVector(uint256 seed) public {
        vm.assume(seed < type(uint256).max - 1000); // Prevent overflow

        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockCidUploadVerifier.setShouldReturnTrue(true);

        address testator = address(uint160(cidUploadProof.pubSignals[0]));

        // Create a modified will JSON with wrong initialization vector
        JsonCidVerifier.TypedJsonObject memory modifiedWill = willJson;
        // Store original value and ensure we modify it to something different
        require(modifiedWill.values[1].numberArray.length > 0, "IV array is empty");
        uint256 originalValue = modifiedWill.values[1].numberArray[0];
        // Ensure the new value is different from the original
        vm.assume(seed != originalValue);
        modifiedWill.values[1].numberArray[0] = seed;

        vm.expectRevert(WillFactory.WrongInitializationVector.selector);
        vm.prank(testator);
        factory.uploadCid(
            cidUploadProof.pA,
            cidUploadProof.pB,
            cidUploadProof.pC,
            cidUploadProof.pubSignals,
            modifiedWill,
            "test_cid"
        );
    }


    function test_CreateWill_RevertOnWrongCiphertext(uint256 seed) public {
        vm.assume(seed < type(uint256).max - 1000); // Prevent overflow

        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockCidUploadVerifier.setShouldReturnTrue(true);
        mockWillCreationVerifier.setShouldReturnTrue(true);

        string memory cid = "test_cid";
        address testator = address(uint160(cidUploadProof.pubSignals[0]));

        // First upload and notarize the CID
        vm.prank(testator);
        factory.uploadCid(
            cidUploadProof.pA,
            cidUploadProof.pB,
            cidUploadProof.pC,
            cidUploadProof.pubSignals,
            willJson,
            cid
        );

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        vm.warp(block.timestamp + 2);

        vm.prank(oracle);
        factory.probateCid(cid);

        // Extract the executor from the proof's public signals
        address proofExecutor = address(uint160(willCreationProof.pubSignals[1]));

        // Create a modified will JSON with wrong ciphertext
        JsonCidVerifier.TypedJsonObject memory modifiedWill = willJson;
        require(modifiedWill.values[3].numberArray.length > 0, "Ciphertext array is empty");
        uint256 originalValue = modifiedWill.values[3].numberArray[0];
        // Ensure the new value is different from the original
        vm.assume(seed != originalValue);
        modifiedWill.values[3].numberArray[0] = seed;

        vm.expectRevert(WillFactory.WrongCiphertext.selector);
        vm.prank(proofExecutor);
        factory.createWill(
            willCreationProof.pA,
            willCreationProof.pB,
            willCreationProof.pC,
            willCreationProof.pubSignals,
            modifiedWill,
            cid
        );
    }

    function test_CreateWill_RevertOnWrongInitializationVector(uint256 seed) public {
        vm.assume(seed < type(uint256).max - 1000); // Prevent overflow

        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockCidUploadVerifier.setShouldReturnTrue(true);
        mockWillCreationVerifier.setShouldReturnTrue(true);

        string memory cid = "test_cid";
        address testator = address(uint160(cidUploadProof.pubSignals[0]));

        // First upload and notarize the CID
        vm.prank(testator);
        factory.uploadCid(
            cidUploadProof.pA,
            cidUploadProof.pB,
            cidUploadProof.pC,
            cidUploadProof.pubSignals,
            willJson,
            cid
        );

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid);

        vm.warp(block.timestamp + 2);

        vm.prank(oracle);
        factory.probateCid(cid);

        // Extract the executor from the proof's public signals
        address proofExecutor = address(uint160(willCreationProof.pubSignals[1]));

        // Create a modified will JSON with wrong initialization vector
        JsonCidVerifier.TypedJsonObject memory modifiedWill = willJson;
        require(modifiedWill.values[1].numberArray.length > 0, "IV array is empty");
        uint256 originalValue = modifiedWill.values[1].numberArray[0];
        // Ensure the new value is different from the original
        vm.assume(seed != originalValue);
        modifiedWill.values[1].numberArray[0] = seed;

        vm.prank(proofExecutor);
        vm.expectRevert(WillFactory.WrongInitializationVector.selector);
        factory.createWill(
            willCreationProof.pA,
            willCreationProof.pB,
            willCreationProof.pC,
            willCreationProof.pubSignals,
            modifiedWill,
            cid
        );
    }
}
