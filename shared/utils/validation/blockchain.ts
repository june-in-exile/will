import { SIGNATURE_CONFIG } from "@config";
import { validateHex } from "./hex.js";
import { ethers } from "ethers";

function validateEthereumAddress(address: string): boolean {
  return ethers.isAddress(address);
}

function validatePrivateKey(privateKey: string): boolean {
  try {
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

function validateSignature(signature: string): boolean {
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

  if (!validateHex(signature)) {
    throw new Error("Signature must be in hexadecimal format");
  }

  return true;
}

export { validateEthereumAddress, validatePrivateKey, validateSignature };
