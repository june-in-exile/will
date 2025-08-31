pragma circom 2.2.2;

include "sponge.circom";
include "../bits.circom";

/**
 * Complete Keccak256 Hash Function
 *
 * Combines padding, absorb, and squeeze phases
 * Generates 32-byte (256-bit) digest
 *
 * @param msgBytes - Number of message bytes
 */
template Keccak256Hash(msgBytes) {
    signal input {byte} msg[msgBytes];
    signal output {byte} digest[32];

    var msgBits = msgBytes * 8;
    var rateBits = 1088;
    var numBlocks = ((msgBits + 2) - 1) \ rateBits + 1;
    var paddedMsgBits = numBlocks * rateBits;
    var digestBits = 256;
    var digestBytes = digestBits \ 8;

    signal bitsMsg[msgBits] <== BytesToBits(msgBytes)(msg);
    signal paddedMsg[paddedMsgBits] <== Padding(msgBits, rateBits)(bitsMsg);
    signal stateArray[5][5][64] <== Absorb(paddedMsgBits, rateBits)(paddedMsg);
    signal bitsDigest[256] <== Squeeze(digestBits, rateBits)(stateArray);
    digest <== BitsToBytes(digestBytes)(bitsDigest);
}