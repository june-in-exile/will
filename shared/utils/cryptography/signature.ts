import {
  validateEthereumAddress,
  validateSignature,
} from "@shared/utils/validation/blockchain.js";
import { keccak256 } from "@shared/utils/cryptography/keccak256.js";
import { createWallet } from "@shared/utils/blockchain.js";
import { ethers } from "ethers";

/**
 * Sign string message
 */
async function signString(
  message: string,
  privateKey: string,
): Promise<string> {
  try {
    // Create wallet instance
    const wallet = createWallet(privateKey);

    // Hash the message
    const hash = keccak256(message);
    const hashBytes = ethers.getBytes(hash);
    if (!hashBytes || hashBytes.length !== 32) {
      throw new Error("Invalid hash bytes generated");
    }

    // Perform signing
    const signature = await wallet.signMessage(hashBytes);

    // Validate signature format
    validateSignature(signature);

    // Additional validation - verify signature immediately
    const signerAddress = wallet.address;
    const isValid = await verify(message, signature, signerAddress);

    if (!isValid) {
      throw new Error("Generated signature failed immediate verification");
    }

    return signature;
  } catch (error) {
    throw new Error(
      `String signing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Verify signature
 */
async function verify(
  message: string,
  signature: string,
  expectedSigner: string,
): Promise<boolean> {
  try {
    if (!validateEthereumAddress(expectedSigner)) {
      throw new Error(`Invalid Ethereum address format: ${expectedSigner}`);
    }

    const recoveredAddress = await recoverSigner(message, signature);

    const normalizedExpectedSigner = expectedSigner.toLocaleLowerCase();
    const normalizedRecovered = recoveredAddress.toLowerCase();

    const isValid = normalizedRecovered === normalizedExpectedSigner;

    return isValid;
  } catch (error) {
    throw new Error(
      `Signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Recover signer address from signature
 */
async function recoverSigner(
  message: string,
  signature: string,
): Promise<string> {
  try {
    validateSignature(signature);

    // Hash the message
    const hash = keccak256(message);
    const hashBytes = ethers.getBytes(hash);
    if (!hashBytes || hashBytes.length !== 32) {
      throw new Error("Invalid hash bytes generated");
    }

    // Recover address
    const recoveredAddress = ethers.verifyMessage(hashBytes, signature);

    // Validate recovered address
    if (!validateEthereumAddress(recoveredAddress)) {
      throw new Error("Failed to recover valid address from signature");
    }

    return recoveredAddress;
  } catch (error) {
    throw new Error(
      `Signer recovery failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { signString, verify, recoverSigner };
