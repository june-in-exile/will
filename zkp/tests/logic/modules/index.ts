import("./keccak256.js").then(({ Keccak256Verification }) => {
  console.log("\n=== Running Keccak256 Tests ===");
  Keccak256Verification.runAllTests();
});

import("./aesGcm.js").then(({ AESVerification }) => {
  console.log("=== Running AES-GCM Tests ===");
  AESVerification.runAllTests();
});

import("./ecdsa.js").then(({ ECDSAVerification }) => {
  console.log("\n=== Running ECDSA Tests ===");
  ECDSAVerification.runAllTests();
});

export * from "./abiEncoder.js";
export * from "./aesGcm.js";
export * from "./ecdsa.js";
export * from "./keccak256.js";