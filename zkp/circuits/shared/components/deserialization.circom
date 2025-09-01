pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "./base64.circom";
include "./bits.circom";
include "./bus.circom";

/**
 * Deserialize circuit that converts serialized byte data into structured will components.
 * Takes serialized bytes containing testator address, estates (beneficiary, token, amount), 
 * will address, nonce, deadline, and signature. The salt field is skipped during processing 
 * as it's not needed for subsequent operations.
 *
 * @param bytesLength - the number of bytes in serialized input
 */
template Deserialize(bytesLength) {
    var testatorBytesLength = 20;
    var beneficiaryBytesLength = 20;
    var tokenBytesLength = 20;
    var amountBytesLength = 16;
    var saltBytesLength = 32;
    var willBytesLength = 20;
    var nonceBytesLength = 16;
    var deadlineBytesLength = 4;
    var signatureBytesLength = 65;
    var totalEstatesLength = bytesLength - (testatorBytesLength + saltBytesLength + willBytesLength + nonceBytesLength + deadlineBytesLength + signatureBytesLength);
    var perEstateLength = beneficiaryBytesLength + tokenBytesLength + amountBytesLength;
    assert (perEstateLength == 56);
    assert (totalEstatesLength % perEstateLength == 0);

    var estateCount = totalEstatesLength \ perEstateLength;

    signal input {byte} serializedBytes[bytesLength];
    signal output {address} testator;   // 20 byte unsigned integer
    output Estate() estates[estateCount];
    signal output {address} will;       // 20 byte unsigned integer
    signal output {uint128} nonce;      // 16 byte (128 bit) unsigned integer
    signal output {uint32} deadline;    // 4 byte (32 bit) unsigned integer
    signal output {byte} signature[signatureBytesLength]; // 65 byte

    signal {byte} testatorBytes[testatorBytesLength];
    signal {byte} beneficiaryBytes[estateCount][beneficiaryBytesLength];
    signal {byte} tokenBytes[estateCount][tokenBytesLength];
    signal {byte} amountBytes[estateCount][amountBytesLength];
    signal {byte} willBytes[willBytesLength];
    signal {byte} nonceBytes[nonceBytesLength];
    signal {byte} deadlineBytes[deadlineBytesLength];

    var byteIdx = 0;

    // process testator
    for (var i = 0; i < testatorBytesLength; i++) {
        testatorBytes[i] <== serializedBytes[byteIdx];
        byteIdx++;
    }    
    testator <== BytesToNum(testatorBytesLength, 0)(testatorBytes);

    // process estates
    for (var estateIdx = 0; estateIdx < estateCount; estateIdx++) {
        // process beneficiary
        for (var i = 0; i < beneficiaryBytesLength; i++) {
            beneficiaryBytes[estateIdx][i] <== serializedBytes[byteIdx];
            byteIdx++;
        }
        estates[estateIdx].beneficiary <== BytesToNum(beneficiaryBytesLength, 0)(beneficiaryBytes[estateIdx]);

        // process token
        for (var i = 0; i < tokenBytesLength; i++) {
            tokenBytes[estateIdx][i] <== serializedBytes[byteIdx];
            byteIdx++;
        }
        estates[estateIdx].token <== BytesToNum(tokenBytesLength, 0)(tokenBytes[estateIdx]);

        // process amount
        for (var i = 0; i < amountBytesLength; i++) {
            amountBytes[estateIdx][i] <== serializedBytes[byteIdx];
            byteIdx++;
        }
        estates[estateIdx].amount <== BytesToNum(amountBytesLength, 0)(amountBytes[estateIdx]);
    }

    // skip salt
    byteIdx += saltBytesLength;

    // process will
    for (var i = 0; i < willBytesLength; i++) {
        willBytes[i] <== serializedBytes[byteIdx];
        byteIdx++;
    }
    will <== BytesToNum(willBytesLength, 0)(willBytes);

    // process nonce
    for (var i = 0; i < nonceBytesLength; i++) {
        nonceBytes[i] <== serializedBytes[byteIdx];
        byteIdx++;
    }
    nonce <== BytesToNum(nonceBytesLength, 0)(nonceBytes);

    // process deadline
    for (var i = 0; i < deadlineBytesLength; i++) {
        deadlineBytes[i] <== serializedBytes[byteIdx];
        byteIdx++;
    }
    deadline <== BytesToNum(deadlineBytesLength, 0)(deadlineBytes);

    // process signature
    for (var i = 0; i < signatureBytesLength; i++) {
        signature[i] <== serializedBytes[byteIdx];
        byteIdx++;
    }
}