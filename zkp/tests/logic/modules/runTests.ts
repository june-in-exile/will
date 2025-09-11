import("./abiEncoder.js").then(({ AbiEncoderVerification }) => {
  console.log("\n=== Running AbiEncoder Tests ===");
  AbiEncoderVerification.runAllTests();
});

import("./aesGcm.js").then(({ AESVerification }) => {
  console.log("=== Running AES-GCM Tests ===");
  AESVerification.runAllTests();
});

import("./ecdsa.js").then(({ ECDSAVerification }) => {
  console.log("\n=== Running ECDSA Tests ===");
  ECDSAVerification.runAllTests();
});

import("./keccak256.js").then(({ Keccak256Verification }) => {
  console.log("\n=== Running Keccak256 Tests ===");
  Keccak256Verification.runAllTests();
});