pragma circom 2.2.2;

include "permitHash.circom";
include "typedDataHash.circom";
include "../bus.circom";

/*
 * Verifies the permit2 signature contained in the will
 * 
 * The imeplementation corresponds to the contracts deployed
 * at Mainnet 0x000000000022d473030f116ddee9f6b43ac78ba3
 * (SignatureTransfer.sol, ./libraries/PermitHash.sol, etc.)
 */
// template VerifyPermit2Signature() {
//     signal input {address} testator;   // 20 byte unsigned integer
//     input TokenPermission() permitted[numPermission];
//     signal input {address} will;       // 20 byte unsigned integer
//     signal input {uint128} nonce;      // 16 byte (128 bit) unsigned integer
//     signal input {uint32} deadline;    // 4 byte (32 bit) unsigned integer
//     signal input {byte} signature[signatureBytesLength]; // 65 byte
//     signal output {bit} validSignature;

// }

