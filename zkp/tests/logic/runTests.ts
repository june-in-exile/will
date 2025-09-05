import("./cryptography/keccak256.js").then(({ Keccak256Verification }) => {
  console.log("\n=== Running Keccak256 Tests ===");
  Keccak256Verification.runAllTests();
});

import("./cryptography/aes-gcm.js").then(({ AESVerification }) => {
  console.log("=== Running AES-GCM Tests ===");
  AESVerification.runAllTests();
});

import("./cryptography/ecdsa.js").then(({ ECDSAVerification }) => {
  console.log("\n=== Running ECDSA Tests ===");
  ECDSAVerification.runAllTests();
});
