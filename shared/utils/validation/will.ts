import { CRYPTO_CONFIG } from "@config";
import { WILL_TYPE } from "@shared/constants/will.js";
import {
  AES_256_GCM,
  CHACHA20_POLY1305,
} from "@shared/constants/cryptography.js";
import { validateEthereumAddress, validateSignature } from "./blockchain.js";
import { Base64String } from "@shared/types/base64String.js";
import type {
  Estate,
  Permit2Signature,
  Will,
  WillType,
  FormattedWill,
  AddressedWill,
  SignedWill,
  SerializedWill,
  EncryptedWill,
  DownloadedWill,
  DecryptedWill,
  DeserializedWill,
} from "@shared/types/index.js";

function validateWill(type: WillType, will: Will) {
  switch (type) {
    case WILL_TYPE.FORMATTED:
      validateFormattedWill(will as FormattedWill);
      break;
    case WILL_TYPE.ADDRESSED:
      validateAddressedWill(will as AddressedWill);
      break;
    case WILL_TYPE.SIGNED:
      validateSignedWill(will as SignedWill);
      break;
    case WILL_TYPE.SERIALIZED:
      validateSerializedWill(will as SerializedWill);
      break;
    case WILL_TYPE.ENCRYPTED:
      validateEncryptedWill(will as EncryptedWill);
      break;
    case WILL_TYPE.DOWNLOADED:
      validateDownloadedWill(will as DownloadedWill);
      break;
    case WILL_TYPE.DECRYPTED:
      validateDecryptedWill(will as DecryptedWill);
      break;
    case WILL_TYPE.DESERIALIZED:
      validateDeserializedWill(will as DeserializedWill);
      break;
    default:
      throw new Error(`Invalid will file type: ${type}`);
  }
}

function validateFormattedWill(
  willData: FormattedWill,
): asserts willData is FormattedWill {
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
  willData: AddressedWill,
): asserts willData is AddressedWill {
  validateFormattedWill(willData);

  const create2Fields: (keyof Pick<AddressedWill, "salt" | "will">)[] = [
    "salt",
    "will",
  ];
  for (const field of create2Fields) {
    if (!willData[field]) {
      throw new Error(`Missing required create2 field: ${field}`);
    }
  }

  if (typeof willData.salt !== "bigint" || willData.salt < 0) {
    throw new Error(
      `Invalid salt (${willData.salt}): salt must be a non-negative bigint`,
    );
  }

  if (!validateEthereumAddress(willData.will)) {
    throw new Error(`Invalid will address: ${willData.will}`);
  }
}

function validateSignedWill(
  willData: SignedWill,
): asserts willData is SignedWill {
  validateAddressedWill(willData);

  if (!willData.permit2) {
    throw new Error("Missing required field: signature");
  }

  const { permit2: signature } = willData;
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

  if (typeof signature.nonce !== "bigint" || signature.nonce < 0) {
    throw new Error(
      `Invalid nonce (${signature.nonce}): nonce must be a non-negative bigint`,
    );
  }

  if (typeof signature.deadline !== "number" || signature.deadline <= 0) {
    throw new Error("Invalid deadline: must be a positive number");
  }

  if (!validateSignature(signature.signature)) {
    throw new Error("Invalid signature format");
  }
}

function validateSerializedWill(
  willData: SerializedWill,
): asserts willData is SerializedWill {
  if (!willData.hex) {
    throw new Error("Missing required field: value");
  }

  if (typeof willData.hex !== "string") {
    throw new Error("Invalid value: must be a string");
  }

  if (willData.hex.trim().length === 0) {
    throw new Error("Value cannot be empty");
  }
}

function validateEncryptedWill(
  willData: EncryptedWill,
): asserts willData is EncryptedWill {
  const requiredFields: (keyof EncryptedWill)[] = [
    "algorithm",
    "iv",
    "authTag",
    "ciphertext",
    "timestamp",
  ];

  for (const field of requiredFields) {
    if (!willData[field]) {
      if (
        field !== "authTag" ||
        [AES_256_GCM, CHACHA20_POLY1305].includes(CRYPTO_CONFIG.algorithm)
      ) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  if (!CRYPTO_CONFIG.supportedAlgorithms.includes(willData.algorithm)) {
    throw new Error(
      `Unsupported encryption algorithm: ${willData.algorithm}. Supported: ${CRYPTO_CONFIG.supportedAlgorithms.join(", ")}`,
    );
  }

  const base64Fields: (keyof Pick<
    DownloadedWill,
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
  willData: DownloadedWill,
): asserts willData is DownloadedWill {
  validateEncryptedWill(willData);
}

function validateDecryptedWill(
  willData: DecryptedWill,
): asserts willData is DecryptedWill {
  validateSerializedWill(willData);
}

function validateDeserializedWill(
  willData: DeserializedWill,
): asserts willData is DeserializedWill {
  validateSignedWill(willData);
}

export {
  validateWill,
  validateFormattedWill,
  validateAddressedWill,
  validateSignedWill,
  validateSerializedWill,
  validateEncryptedWill,
  validateDownloadedWill,
  validateDecryptedWill,
  validateDeserializedWill,
};
