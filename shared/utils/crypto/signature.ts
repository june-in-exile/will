import { SIGNATURE_CONFIG } from "@config";
import type { SignatureValidationResult } from "@shared/types/crypto.js";
import {
  validateEthereumAddress,
  validateSignature,
} from "@shared/utils/validation/blockchain.js";
import { keccak256 } from "@shared/utils/crypto/keccak256.js";
import { createWallet } from "@shared/utils/crypto/blockchain.js";
import { ethers, Wallet, JsonRpcProvider } from "ethers";
import chalk from "chalk";

/**
 * Validate message input
 */
function validateMessage(message: string): boolean {
  if (typeof message !== "string") {
    throw new Error("Message must be a string");
  }

  if (message.length === 0) {
    throw new Error("Message cannot be empty");
  }

  if (message.length > SIGNATURE_CONFIG.maxMessageLength) {
    throw new Error(
      `Message too long: ${message.length} characters (max: ${SIGNATURE_CONFIG.maxMessageLength})`,
    );
  }

  return true;
}

/**
 * Sign message with retry mechanism
 */
async function performSigning(
  wallet: Wallet,
  hashBytes: Uint8Array,
  retryCount: number = 0,
): Promise<string> {
  try {
    const signature = await wallet.signMessage(hashBytes);

    // Validate signature format
    validateSignature(signature);

    return signature;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red(`❌ Signing attempt ${retryCount + 1} failed:`),
      errorMessage,
    );

    // Retry logic for transient failures
    if (retryCount < SIGNATURE_CONFIG.maxRetries) {
      console.log(
        chalk.yellow(
          `⚠️ Retrying signature generation (attempt ${retryCount + 2}/${SIGNATURE_CONFIG.maxRetries + 1})...`,
        ),
      );

      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, SIGNATURE_CONFIG.retryDelay),
      );

      return performSigning(wallet, hashBytes, retryCount + 1);
    }

    throw new Error(
      `Signature generation failed after ${SIGNATURE_CONFIG.maxRetries + 1} attempts: ${errorMessage}`,
    );
  }
}

/**
 * Sign string message with comprehensive validation
 */
async function signString(
  message: string,
  privateKey: string,
): Promise<string> {
  try {
    // Validate inputs
    validateMessage(message);

    // Create wallet instance
    const wallet = createWallet(privateKey);

    // Hash the message
    const hash = keccak256(message);
    const hashBytes = ethers.getBytes(hash);

    // Validate hash bytes
    if (!hashBytes || hashBytes.length !== 32) {
      throw new Error("Invalid hash bytes generated");
    }

    // Sign the message with retry mechanism
    const signature = await performSigning(wallet, hashBytes);

    // Additional validation - verify signature immediately
    const signerAddress = wallet.address;
    const isValid = await verify(message, signature, signerAddress);

    if (!isValid) {
      throw new Error("Generated signature failed immediate verification");
    }

    return signature;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red("Error in signString:"), errorMessage);
    throw new Error(`String signing failed: ${errorMessage}`);
  }
}

/**
 * Verify signature with comprehensive validation
 */
async function verify(
  message: string,
  signature: string,
  expectedSigner: string,
): Promise<boolean> {
  try {
    // Validate inputs
    validateMessage(message);
    validateSignature(signature);
    if (!validateEthereumAddress(expectedSigner)) {
      throw new Error(`Invalid Ethereum address format: ${expectedSigner}`);
    }
    const normalizedExpectedSigner = expectedSigner.toLocaleLowerCase();

    // Hash the message
    const hash = keccak256(message);
    const hashBytes = ethers.getBytes(hash);

    // Validate hash bytes
    if (!hashBytes || hashBytes.length !== 32) {
      throw new Error("Invalid hash bytes generated");
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(hashBytes, signature);

    // Validate recovered address
    if (!ethers.isAddress(recoveredAddress)) {
      throw new Error("Signature verification returned invalid address");
    }

    // Normalize recovered address for comparison
    const normalizedRecovered = recoveredAddress.toLowerCase();

    // Compare addresses
    const isValid = normalizedRecovered === normalizedExpectedSigner;

    return isValid;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red("Error in verify:"), errorMessage);
    throw new Error(`Signature verification failed: ${errorMessage}`);
  }
}

/**
 * Utility function to recover signer address from signature
 */
async function recoverSigner(
  message: string,
  signature: string,
): Promise<string> {
  try {
    // Validate inputs
    validateMessage(message);
    validateSignature(signature);

    // Hash the message
    const hash = keccak256(message);
    const hashBytes = ethers.getBytes(hash);

    // Recover address
    const recoveredAddress = ethers.verifyMessage(hashBytes, signature);

    // Validate recovered address
    if (!ethers.isAddress(recoveredAddress)) {
      throw new Error("Failed to recover valid address from signature");
    }

    return recoveredAddress;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Signer recovery failed: ${errorMessage}`);
  }
}

export { signString, verify, recoverSigner };
