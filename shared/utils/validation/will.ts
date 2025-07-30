import { CRYPTO_CONFIG } from "@config";
import { validateEthereumAddress, validateSignature } from "./blockchain.js";
import { Base64String } from "@shared/types/base64String.js";
import type {
  FormattedWillData,
  AddressedWillData,
  SignedWillData,
  EncryptedWillData,
  DownloadedWillData,
} from "@shared/types/will.js";
import type { Permit2Signature } from "@shared/types/blockchain.js";
import { Estate } from "@shared/types/blockchain.js";

function validateFormattedWill(
  willData: FormattedWillData,
): asserts willData is FormattedWillData {
  if (!willData.testator) {
    throw new Error("Missing required field: testator");
  }

  if (!validateEthereumAddress(willData.testator)) {
    throw new Error(`Invalid testator address: ${willData.testator}`);
  }

  if (!willData.estates || !Array.isArray(willData.estates)) {
    throw new Error("Missing or invalid estates array");
  }

  if (willData.estates.length === 0) {
    throw new Error("Estates array cannot be empty");
  }

  willData.estates.forEach((estate: Estate, index: number) => {
    const requiredFields: (keyof Estate)[] = ["beneficiary", "token", "amount"];
    for (const field of requiredFields) {
      if (!estate[field]) {
        throw new Error(`Missing required field '${field}' in estate ${index}`);
      }
    }

    if (!validateEthereumAddress(estate.beneficiary)) {
      throw new Error(
        `Invalid beneficiary address in estate ${index}: ${estate.beneficiary}`,
      );
    }

    if (!validateEthereumAddress(estate.token)) {
      throw new Error(
        `Invalid token address in estate ${index}: ${estate.token}`,
      );
    }

    if (typeof estate.amount === "string") {
      try {
        estate.amount = BigInt(estate.amount);
      } catch {
        throw new Error(`Invalid amount in estate ${index}: ${estate.amount}`);
      }
    }

    if (typeof estate.amount === "bigint" && estate.amount <= 0n) {
      throw new Error(
        `Amount must be greater than zero in estate ${index}: ${estate.amount}`,
      );
    }
  });
}

function validateAddressedWill(
  willData: AddressedWillData,
): asserts willData is AddressedWillData {
  validateFormattedWill(willData);

  const create2Fields: (keyof Pick<AddressedWillData, "salt" | "will">)[] = [
    "salt",
    "will",
  ];
  for (const field of create2Fields) {
    if (!willData[field]) {
      throw new Error(`Missing required create2 field: ${field}`);
    }
  }

  if (typeof willData.salt !== "number" || willData.salt < 0) {
    throw new Error("Invalid salt: must be a non-negative number");
  }

  if (!validateEthereumAddress(willData.will)) {
    throw new Error(`Invalid will address: ${willData.will}`);
  }
}

function validateSignedWill(
  willData: SignedWillData,
): asserts willData is SignedWillData {
  validateAddressedWill(willData);

  if (!willData.signature) {
    throw new Error("Missing required field: signature");
  }

  const { signature } = willData;
  const requiredSigFields: (keyof Permit2Signature)[] = [
    "nonce",
    "deadline",
    "signature",
  ];
  for (const field of requiredSigFields) {
    if (!signature[field]) {
      throw new Error(`Missing required signature field: ${field}`);
    }
  }

  if (typeof signature.nonce !== "number" || signature.nonce < 0) {
    throw new Error("Invalid nonce: must be a non-negative number");
  }

  if (typeof signature.deadline !== "number" || signature.deadline <= 0) {
    throw new Error("Invalid deadline: must be a positive number");
  }

  if (!validateSignature(signature.signature)) {
    throw new Error("Invalid signature format");
  }
}

function validateEncryptedWill(
  willData: EncryptedWillData,
): asserts willData is EncryptedWillData {
  const requiredFields: (keyof EncryptedWillData)[] = [
    "algorithm",
    "iv",
    "authTag",
    "ciphertext",
    "timestamp",
  ];

  for (const field of requiredFields) {
    if (!willData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!CRYPTO_CONFIG.supportedAlgorithms.includes(willData.algorithm)) {
    throw new Error(
      `Unsupported encryption algorithm: ${willData.algorithm}. Supported: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`,
    );
  }

  const base64Fields: (keyof Pick<
    DownloadedWillData,
    "iv" | "authTag" | "ciphertext"
  >)[] = ["iv", "authTag", "ciphertext"];
  for (const field of base64Fields) {
    if (!Base64String.isValid(willData[field])) {
      throw new Error(`Invalid Base64 format for field: ${field}`);
    }
  }

  if (willData.iv.length < 12) {
    throw new Error(
      `IV too short: expected at least 12 characters, got ${willData.iv.length}`,
    );
  }

  if (typeof willData.timestamp !== "number" || willData.timestamp <= 0) {
    throw new Error("Invalid timestamp: must be a positive number");
  }
}

function validateDownloadedWill(
  willData: DownloadedWillData,
): asserts willData is DownloadedWillData {
  validateEncryptedWill(willData);
}

export {
  validateFormattedWill,
  validateAddressedWill,
  validateSignedWill,
  validateEncryptedWill,
  validateDownloadedWill,
};
