import chalk from "chalk";

import("./abiEncoder.js").then(({ AbiEncoderVerification }) => {
  console.log(chalk.bgBlueBright("\n=== Running AbiEncoder Tests ==="));
  AbiEncoderVerification.runAllTests();
});

import("./aesGcm.js").then(({ AESVerification }) => {
  console.log(chalk.bgBlueBright("=== Running AES-GCM Tests ==="));
  AESVerification.runAllTests();
});

import("./ecdsa.js").then(({ ECDSAVerification }) => {
  console.log(chalk.bgBlueBright("\n=== Running ECDSA Tests ==="));
  ECDSAVerification.runAllTests();
});

import("./keccak256.js").then(({ Keccak256Verification }) => {
  console.log(chalk.bgBlueBright("\n=== Running Keccak256 Tests ==="));
  Keccak256Verification.runAllTests();
});

import("./permitVerify.js").then(({ Permit2Verification }) => {
  console.log(chalk.bgBlueBright("\n=== Running Permit Verify Tests ==="));
  Permit2Verification.runAllTests();
});
