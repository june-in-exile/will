pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "./base64.circom";
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

    signal {address} testatorValues[testatorBytesLength];
    signal {address} beneficiaryValues[estateCount][beneficiaryBytesLength];
    signal {address} tokenValues[estateCount][tokenBytesLength];
    signal amountValues[estateCount][amountBytesLength];
    signal {address} willValues[willBytesLength];
    signal {uint128} nonceValues[nonceBytesLength];
    signal {uint32} deadlineValues[deadlineBytesLength];

    var byteIdx = 0;

    // process testator
    for (var i = 0; i < testatorBytesLength; i++) {
        if (i == 0) {
            testatorValues[i] <== serializedBytes[byteIdx];
        } else {
            testatorValues[i] <== testatorValues[i - 1] * 256 + serializedBytes[byteIdx];
        }
        byteIdx++;
    }
    testator <== testatorValues[testatorBytesLength - 1];

    // process estates
    for (var estateIdx = 0; estateIdx < estateCount; estateIdx++) {
        // process beneficiary
        for (var i = 0; i < beneficiaryBytesLength; i++) {
            if (i == 0) {
                beneficiaryValues[estateIdx][i] <== serializedBytes[byteIdx];
            } else {
                beneficiaryValues[estateIdx][i] <== beneficiaryValues[estateIdx][i - 1] * 256 + serializedBytes[byteIdx];
            }
            byteIdx++;
        }
        estates[estateIdx].beneficiary <== beneficiaryValues[estateIdx][beneficiaryBytesLength - 1];

        // process token
        for (var i = 0; i < tokenBytesLength; i++) {
            if (i == 0) {
                tokenValues[estateIdx][i] <== serializedBytes[byteIdx];
            } else {
                tokenValues[estateIdx][i] <== tokenValues[estateIdx][i - 1] * 256 + serializedBytes[byteIdx];
            }
            byteIdx++;
        }
        estates[estateIdx].token <== tokenValues[estateIdx][tokenBytesLength - 1];

        // process amount
        for (var i = 0; i < amountBytesLength; i++) {
            if (i == 0) {
                amountValues[estateIdx][i] <== serializedBytes[byteIdx];
            } else {
                amountValues[estateIdx][i] <== amountValues[estateIdx][i - 1] * 256 + serializedBytes[byteIdx];
            }
            byteIdx++;
        }
        estates[estateIdx].amount <== amountValues[estateIdx][amountBytesLength - 1];
    }

    // skip salt
    byteIdx += saltBytesLength;

    // process will
    for (var i = 0; i < willBytesLength; i++) {
        if (i == 0) {
            willValues[i] <== serializedBytes[byteIdx];
        } else {
            willValues[i] <== willValues[i - 1] * 256 + serializedBytes[byteIdx];
        }
        byteIdx++;
    }
    will <== willValues[willBytesLength - 1];

    // process nonce
    for (var i = 0; i < nonceBytesLength; i++) {
        if (i == 0) {
            nonceValues[i] <== serializedBytes[byteIdx];
        } else {
            nonceValues[i] <== nonceValues[i - 1] * 256 + serializedBytes[byteIdx];
        }
        byteIdx++;
    }
    nonce <== nonceValues[nonceBytesLength - 1];

    // process deadline
    for (var i = 0; i < deadlineBytesLength; i++) {
        if (i == 0) {
            deadlineValues[i] <== serializedBytes[byteIdx];
        } else {
            deadlineValues[i] <== deadlineValues[i - 1] * 256 + serializedBytes[byteIdx];
        }
        byteIdx++;
    }
    deadline <== deadlineValues[deadlineBytesLength - 1];

    // process signature
    for (var i = 0; i < signatureBytesLength; i++) {
        signature[i] <== serializedBytes[byteIdx];
        byteIdx++;
    }
}