// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "src/CidUploadVerifier.sol";
import "src/WillCreationVerifier.sol";
import "mock/MockContracts.sol";

/*
 * @note Prerequisite for this test:
 *  1. `make fork` a virtual env
 *  2. `make deploy` necessary contracts
 *  3. `make all` in apps/backend to generate test data (e.g., encrypted will, ZKP).
 */
contract WillFactoryFuzzTest is Test {
    struct CidUploadProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[290] pubSignals;
    }

    struct WillCreationProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[300] pubSignals;
    }

    WillFactory factory;
    MockCidUploadVerifier mockCidUploadVerifier;
    MockWillCreationVerifier mockWillCreationVerifier;
    MockJsonCidVerifier mockJsonCidVerifier;

    uint256 notaryPrivateKey = 0x1111111111111111111111111111111111111111111111111111111111111111;
    address notary;
    address executor = makeAddr("executor");
    address permit2 = makeAddr("permit2");
    uint8 maxEstates = 2;

    JsonCidVerifier.TypedJsonObject willJson;
    CidUploadProofData cidUploadProof = _getCidUploadProofFromFiles();
    WillCreationProofData willCreationProof = _getWillCreationProofFromFiles();

    function setUp() public {
        notary = vm.addr(notaryPrivateKey);

        mockCidUploadVerifier = new MockCidUploadVerifier();
        mockWillCreationVerifier = new MockWillCreationVerifier();
        mockJsonCidVerifier = new MockJsonCidVerifier();

        factory = new WillFactory(
            address(mockCidUploadVerifier),
            address(mockWillCreationVerifier),
            address(mockJsonCidVerifier),
            notary,
            executor,
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

        address predicted1 = factory.predictWill(testator, estates, salt);
        address predicted2 = factory.predictWill(testator, estates, salt);

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

        address predicted1 = factory.predictWill(testator, estates, salt1);
        address predicted2 = factory.predictWill(testator, estates, salt2);

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

        vm.warp(block.timestamp + 1);

        // Create a modified will JSON with wrong ciphertext
        JsonCidVerifier.TypedJsonObject memory modifiedWill = willJson;
        require(modifiedWill.values[3].numberArray.length > 0, "Ciphertext array is empty");
        uint256 originalValue = modifiedWill.values[3].numberArray[0];
        // Ensure the new value is different from the original
        vm.assume(seed != originalValue);
        modifiedWill.values[3].numberArray[0] = seed;

        vm.expectRevert(WillFactory.WrongCiphertext.selector);
        vm.prank(executor);
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

        vm.warp(block.timestamp + 1);

        // Create a modified will JSON with wrong initialization vector
        JsonCidVerifier.TypedJsonObject memory modifiedWill = willJson;
        require(modifiedWill.values[1].numberArray.length > 0, "IV array is empty");
        uint256 originalValue = modifiedWill.values[1].numberArray[0];
        // Ensure the new value is different from the original
        vm.assume(seed != originalValue);
        modifiedWill.values[1].numberArray[0] = seed;

        vm.prank(executor);
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

    function _getEncryptedWillFromFile() public view returns (JsonCidVerifier.TypedJsonObject memory) {
        string memory encryptedJsonPath = "../apps/backend/will/6_encrypted.json";
        string memory encryptedJson = vm.readFile(encryptedJsonPath);

        JsonCidVerifier.TypedJsonObject memory willTypedJsonObj;
        willTypedJsonObj.keys = new string[](5);
        willTypedJsonObj.values = new JsonCidVerifier.JsonValue[](5);

        willTypedJsonObj.keys[0] = "algorithm";
        willTypedJsonObj.keys[1] = "iv";
        willTypedJsonObj.keys[2] = "authTag";
        willTypedJsonObj.keys[3] = "ciphertext";
        willTypedJsonObj.keys[4] = "timestamp";

        string memory algorithm = abi.decode(vm.parseJson(encryptedJson, ".algorithm"), (string));
        uint256[] memory iv = abi.decode(vm.parseJson(encryptedJson, ".iv"), (uint256[]));
        uint256[] memory authTag = abi.decode(vm.parseJson(encryptedJson, ".authTag"), (uint256[]));
        uint256[] memory ciphertext = abi.decode(vm.parseJson(encryptedJson, ".ciphertext"), (uint256[]));
        uint256 timestamp = abi.decode(vm.parseJson(encryptedJson, ".timestamp"), (uint256));

        willTypedJsonObj.values[0] = JsonCidVerifier.JsonValue(algorithm, new uint[](0), JsonCidVerifier.JsonValueType.STRING);
        willTypedJsonObj.values[1] = JsonCidVerifier.JsonValue("", iv, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[2] = JsonCidVerifier.JsonValue("", authTag, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[3] = JsonCidVerifier.JsonValue("", ciphertext, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[4] = JsonCidVerifier.JsonValue(vm.toString(timestamp), new uint[](0), JsonCidVerifier.JsonValueType.NUMBER);

        return willTypedJsonObj;
    }

    function _getCidUploadProofFromFiles() public view returns (CidUploadProofData memory) {
        string memory proofPath = "../zkp/circuits/cidUpload/proofs/proof.json";
        string memory publicPath = "../zkp/circuits/cidUpload/proofs/public.json";

        string memory proofJson = vm.readFile(proofPath);
        string memory publicJson = vm.readFile(publicPath);

        // Parse proof.json
        uint256[2] memory pA;
        uint256[2][2] memory pB;
        uint256[2] memory pC;

        string memory pA0Str = abi.decode(vm.parseJson(proofJson, ".pi_a[0]"), (string));
        string memory pA1Str = abi.decode(vm.parseJson(proofJson, ".pi_a[1]"), (string));
        pA[0] = vm.parseUint(pA0Str);
        pA[1] = vm.parseUint(pA1Str);

        // @note G2 point (pB) needs to swap the order
        pB[0][0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[0][1]"), (string)));
        pB[0][1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[0][0]"), (string)));
        pB[1][0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[1][1]"), (string)));
        pB[1][1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[1][0]"), (string)));

        pC[0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_c[0]"), (string)));
        pC[1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_c[1]"), (string)));

        // Parse public.json
        string[] memory pubStringArray = abi.decode(vm.parseJson(publicJson), (string[]));
        require(pubStringArray.length == 290, "Public signals array must have exactly 290 elements");

        uint256[290] memory pubSignals;
        for (uint256 i = 0; i < 290; i++) {
            pubSignals[i] = vm.parseUint(pubStringArray[i]);
        }

        return CidUploadProofData({ pA: pA, pB: pB, pC: pC, pubSignals: pubSignals });
    }

    function _getWillCreationProofFromFiles() public view returns (WillCreationProofData memory) {
        string memory proofPath = "../zkp/circuits/willCreation/proofs/proof.json";
        string memory publicPath = "../zkp/circuits/willCreation/proofs/public.json";

        string memory proofJson = vm.readFile(proofPath);
        string memory publicJson = vm.readFile(publicPath);

        // Parse proof.json
        uint256[2] memory pA;
        uint256[2][2] memory pB;
        uint256[2] memory pC;

        pA[0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_a[0]"), (string)));
        pA[1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_a[1]"), (string)));

        // @note G2 point (pB) needs to swap the order
        pB[0][0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[0][1]"), (string)));
        pB[0][1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[0][0]"), (string)));
        pB[1][0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[1][1]"), (string)));
        pB[1][1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_b[1][0]"), (string)));

        pC[0] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_c[0]"), (string)));
        pC[1] = vm.parseUint(abi.decode(vm.parseJson(proofJson, ".pi_c[1]"), (string)));

        // Parse public.json
        string[] memory pubStringArray = abi.decode(vm.parseJson(publicJson), (string[]));
        require(pubStringArray.length == 300, "Public signals array must have exactly 300 elements");

        uint256[300] memory pubSignals;
        for (uint256 i = 0; i < 300; i++) {
            pubSignals[i] = vm.parseUint(pubStringArray[i]);
        }

        return WillCreationProofData({ pA: pA, pB: pB, pC: pC, pubSignals: pubSignals });
    }
}
