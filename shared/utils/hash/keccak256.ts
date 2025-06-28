import { HASH_CONFIG } from "@shared/config";
import type { HashableInput, ByteInput } from "@shared/types";
import { ethers } from "ethers";
import chalk from "chalk";

/**
 * Validate input message
 */
function validateInput(input: HashableInput): string {
  // Check for null/undefined
  if (input === null || input === undefined) {
    throw new Error("Input cannot be null or undefined");
  }

  // Convert to string if not already
  let message: string;
  if (typeof input === "string") {
    message = input;
  } else if (typeof input === "number" || typeof input === "boolean") {
    message = String(input);
  } else if (typeof input === "object") {
    try {
      message = JSON.stringify(input);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Cannot serialize object to string: ${errorMessage}`);
    }
  } else {
    throw new Error(`Unsupported input type: ${typeof input}`);
  }

  // Check size limits
  const sizeInBytes = Buffer.byteLength(message, "utf8");
  if (sizeInBytes > HASH_CONFIG.maxInputSize) {
    throw new Error(
      `Input too large: ${sizeInBytes} bytes (max: ${HASH_CONFIG.maxInputSize} bytes)`,
    );
  }

  if (HASH_CONFIG.enableLogging && sizeInBytes > 1024) {
    console.log(chalk.gray(`Hashing large input: ${sizeInBytes} bytes`));
  }

  return message;
}

/**
 * Validate UTF-8 encoding
 */
function validateEncoding(message: string, encoding: string = "utf8"): Buffer {
  try {
    if (!HASH_CONFIG.supportedEncodings.includes(encoding.toLowerCase())) {
      throw new Error(
        `Unsupported encoding: ${encoding}. Supported: ${HASH_CONFIG.supportedEncodings.join(", ")}`,
      );
    }

    // Test encoding/decoding cycle for validation
    const buffer = Buffer.from(message, encoding as BufferEncoding);
    const decoded = buffer.toString(encoding as BufferEncoding);

    // For UTF-8, check if decode matches original (detect invalid sequences)
    if (encoding.toLowerCase().includes("utf") && decoded !== message) {
      console.warn(
        chalk.yellow(
          "⚠️ Warning: UTF-8 encoding/decoding cycle mismatch detected",
        ),
      );
    }

    return buffer;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Encoding validation failed: ${errorMessage}`);
  }
}

/**
 * Validate hash output
 */
function validateHashOutput(hash: string): boolean {
  if (!hash || typeof hash !== "string") {
    throw new Error("Hash function returned invalid result");
  }

  if (hash.length !== HASH_CONFIG.expectedHashLength) {
    throw new Error(
      `Invalid hash length: expected ${HASH_CONFIG.expectedHashLength}, got ${hash.length}`,
    );
  }

  if (!HASH_CONFIG.hashPattern.test(hash)) {
    throw new Error(
      "Hash does not match expected pattern (0x followed by 64 hex characters)",
    );
  }

  return true;
}

/**
 * Hash raw bytes directly
 */
export function keccak256Bytes(bytes: ByteInput): string {
  try {
    // Validate input
    if (!bytes) {
      throw new Error("Bytes input cannot be null or undefined");
    }

    // Convert various byte formats to Uint8Array
    let byteArray: Uint8Array;
    if (bytes instanceof Uint8Array) {
      byteArray = bytes;
    } else if (bytes instanceof ArrayBuffer) {
      byteArray = new Uint8Array(bytes);
    } else if (Buffer.isBuffer(bytes)) {
      byteArray = new Uint8Array(bytes);
    } else if (Array.isArray(bytes)) {
      // Validate array contains only valid byte values
      if (!bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)) {
        throw new Error("Array must contain only integers between 0-255");
      }
      byteArray = new Uint8Array(bytes);
    } else {
      throw new Error(
        "Bytes input must be Uint8Array, ArrayBuffer, Buffer, or number array",
      );
    }

    if (byteArray.length === 0) {
      throw new Error("Byte array cannot be empty");
    }

    if (byteArray.length > HASH_CONFIG.maxInputSize) {
      throw new Error(
        `Byte array too large: ${byteArray.length} bytes (max: ${HASH_CONFIG.maxInputSize} bytes)`,
      );
    }

    // Perform hashing
    const hash = ethers.keccak256(byteArray);

    // Validate output
    if (HASH_CONFIG.enableValidation) {
      validateHashOutput(hash);
    }

    if (HASH_CONFIG.enableLogging) {
      console.log(chalk.gray("Hash generated from bytes:"), {
        inputLength: byteArray.length,
        hash: hash,
      });
    }

    return hash;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Keccak256 bytes hashing failed: ${errorMessage}`);
  }
}

/**
 * Main Keccak256 hash function with comprehensive validation and encoding support
 */
export function keccak256(
  input: HashableInput,
  encoding: string = "utf8",
): string {
  try {
    // Validate and normalize input
    const message = validateInput(input);

    // Validate encoding and convert to bytes
    const messageBuffer = validateEncoding(message, encoding);

    // Convert buffer to Uint8Array for ethers
    const messageBytes = new Uint8Array(messageBuffer);

    // Perform hashing
    let hash: string;
    try {
      hash = ethers.keccak256(messageBytes);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Keccak256 hashing failed: ${errorMessage}`);
    }

    // Validate output
    if (HASH_CONFIG.enableValidation) {
      validateHashOutput(hash);
    }

    if (HASH_CONFIG.enableLogging) {
      const inputPreview =
        message.length > 50 ? `${message.substring(0, 50)}...` : message;
      console.log(chalk.gray(`Hash generated with ${encoding} encoding:`), {
        input: inputPreview,
        inputLength: message.length,
        encoding: encoding,
        hash: hash,
      });
    }

    return hash;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Keccak256 hash generation failed: ${errorMessage}`);
  }
}

/**
 * Hash multiple inputs and return combined hash
 */
export function keccak256Multi(...inputs: (HashableInput | string)[]): string {
  try {
    if (inputs.length === 0) {
      throw new Error("At least one input is required");
    }

    // Check if last argument is encoding string
    let encoding = "utf8";
    let actualInputs: (HashableInput | string)[] = inputs;

    const lastArg = inputs[inputs.length - 1];
    if (
      typeof lastArg === "string" &&
      HASH_CONFIG.supportedEncodings.includes(lastArg.toLowerCase())
    ) {
      encoding = lastArg;
      actualInputs = inputs.slice(0, -1);

      if (actualInputs.length === 0) {
        throw new Error(
          "At least one input is required besides encoding parameter",
        );
      }
    }

    // Validate all inputs and convert to messages
    const messages = actualInputs.map((input, index) => {
      try {
        return validateInput(input as HashableInput);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Invalid input at index ${index}: ${errorMessage}`);
      }
    });

    // Concatenate all messages
    const combinedMessage = messages.join("");

    // Hash the combined message with specified encoding
    return keccak256(combinedMessage, encoding);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Multi-input keccak256 failed: ${errorMessage}`);
  }
}

/**
 * Verify if a string is a valid keccak256 hash
 */
export function isValidKeccak256Hash(hash: unknown): hash is string {
  try {
    if (typeof hash !== "string") {
      return false;
    }

    return HASH_CONFIG.hashPattern.test(hash);
  } catch (error) {
    return false;
  }
}

/**
 * Compare two hashes securely (constant-time comparison)
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  try {
    // Validate both hashes
    if (!isValidKeccak256Hash(hash1) || !isValidKeccak256Hash(hash2)) {
      throw new Error("One or both inputs are not valid keccak256 hashes");
    }

    // Normalize to lowercase for comparison
    const normalizedHash1 = hash1.toLowerCase();
    const normalizedHash2 = hash2.toLowerCase();

    // Constant-time comparison to prevent timing attacks
    if (normalizedHash1.length !== normalizedHash2.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < normalizedHash1.length; i++) {
      result |= normalizedHash1.charCodeAt(i) ^ normalizedHash2.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Hash comparison failed: ${errorMessage}`);
  }
}

/**
 * Utility function to hash common data types
 */
export function hashCommonTypes(
  data: HashableInput,
  encoding: string = "utf8",
): string {
  try {
    if (typeof data === "string") {
      return keccak256(data, encoding);
    } else if (typeof data === "object" && data !== null) {
      // For objects, create deterministic string representation
      const jsonString = JSON.stringify(data, Object.keys(data).sort());
      return keccak256(jsonString, encoding);
    } else if (Array.isArray(data)) {
      // For arrays, join elements and hash
      const arrayString = data
        .map((item) =>
          typeof item === "object" ? JSON.stringify(item) : String(item),
        )
        .join("|");
      return keccak256(arrayString, encoding);
    } else {
      return keccak256(String(data), encoding);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Common type hashing failed: ${errorMessage}`);
  }
}
