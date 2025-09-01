pragma circom 2.2.2;

include "./base64.circom";
include "./bus.circom";

template Deserialize(serializedBytesLength) {
    signal input {byte} serialized[serializedBytesLength];
    signal output {address} testator;   // 20 byte unsigned integer
    output Estate estates;
    signal output {address} will;       // 20 byte unsigned integer
    signal output nonce;                // 16 byte (128 bit) unsigned integer
    signal output {uint32} deadline;    // 4 byte (32 bit) unsigned integer
    signal output {byte} signature[65]; // 65 byte

    signal {hex} serializedHex[serializedBytes * 2] <== BytesToHex(serializedBytesLength)(serialized);

    // process testator (40 hex -> integer)

    // process estate count (until ':' -> integer)

    // process estates (for loop by estate count)
        // process beneficiary (40 hex -> integer)
        // process token (40 hex -> integer)
        // process amount (until ':' -> integer)

    // process salt (64 hex skipped)

    // process will (40 hex -> integer)

    // process nonce (32 hex -> integer)

    // process deadline (8 hex -> integer)

    // process signature (130 hex -> 65 bytes)

}

// 041F57c4492760aaE44ECed29b49a30DaAD3D4Cc2:3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d3e8:3fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E4c4b40:ddb403290f11dd9d21f83a67e8b28dbb8456292218039e1a29e41d2908552376fD50f1D6937151dB2d20C6C47d5AE287fDf0cd1bba3ff4b04a0ed28bcdfd4f4f03b1dae46a965efbdb55f324c7f57f759055d61c3dc3c637a3e337bc01c9ee24a5ca9595ab80012a7ec2e405d2b7d1c864303e2bf1875e009b2bce61ef352976336a97f484f3572f1c
