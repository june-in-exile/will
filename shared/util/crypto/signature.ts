import { SIGNATURE_CONFIG } from "@config";
import type { SignatureValidationResult } from "@type/crypto.js";
import {
  validateEthereumAddress,
  validateSignature,
} from "@util/format/wallet.js";
import { keccak256 } from "@shared/util/crypto/keccak256.js";
import { ethers, Wallet } from "ethers";
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
 * Validate private key format
 */
function validatePrivateKey(privateKey: string): string {
  if (typeof privateKey !== "string") {
    throw new Error("Private key must be a string");
  }

  // Remove 0x prefix if present
  const cleanKey = privateKey.startsWith("0x")
    ? privateKey.slice(2)
    : privateKey;

  if (cleanKey.length !== SIGNATURE_CONFIG.privateKeyLength) {
    throw new Error(
      `Invalid private key length: expected ${SIGNATURE_CONFIG.privateKeyLength} characters, got ${cleanKey.length}`,
    );
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
    throw new Error("Private key must be in hexadecimal format");
  }

  // Check for obviously weak keys
  if (
    cleanKey === "0".repeat(SIGNATURE_CONFIG.privateKeyLength) ||
    cleanKey === "f".repeat(SIGNATURE_CONFIG.privateKeyLength)
  ) {
    throw new Error("Private key appears to be weak (all zeros or all ones)");
  }

  return cleanKey;
}

/**
 * Create wallet instance with validation
 */
function createWalletInstance(privateKey: string): Wallet {
  try {
    // Add 0x prefix if not present
    const formattedKey = privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`;

    const wallet = new ethers.Wallet(formattedKey);

    // Verify wallet creation was successful
    const address = wallet.address;
    if (!ethers.isAddress(address)) {
      throw new Error("Failed to create valid wallet from private key");
    }

    return wallet;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create wallet: ${errorMessage}`);
  }
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
export async function signString(
  message: string,
  privateKey: string,
): Promise<string> {
  try {
    // Validate inputs
    validateMessage(message);
    const cleanPrivateKey = validatePrivateKey(privateKey);

    // Create wallet instance
    const wallet = createWalletInstance(cleanPrivateKey);

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
export async function verify(
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
export async function recoverSigner(
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

/**
 * Utility function to validate signature without knowing the signer
 */
export async function isValidSignature(
  message: string,
  signature: string,
): Promise<SignatureValidationResult> {
  try {
    validateMessage(message);
    validateSignature(signature);

    // Try to recover the signer - if this succeeds, signature is valid
    const recoveredAddress = await recoverSigner(message, signature);

    return {
      valid: true,
      signer: recoveredAddress,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      valid: false,
      error: errorMessage,
    };
  }
}
