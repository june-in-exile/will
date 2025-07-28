import { SIGNATURE_CONFIG } from "@config";
import { ethers } from "ethers";

export function validateEthereumAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function validatePrivateKey(privateKey: string): boolean {
  try {
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

export function validateSignature(signature: string): boolean {
  if (typeof signature !== "string") {
    throw new Error("Signature must be a string");
  }

  if (!signature.startsWith("0x")) {
    throw new Error("Signature must start with 0x prefix");
  }

  if (signature.length !== SIGNATURE_CONFIG.signatureLength) {
    throw new Error(
      `Invalid signature length: expected ${SIGNATURE_CONFIG.signatureLength} characters, got ${signature.length}`,
    );
  }

  // Validate hex format
  const hexPart = signature.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    throw new Error("Signature must be in hexadecimal format");
  }

  return true;
}
