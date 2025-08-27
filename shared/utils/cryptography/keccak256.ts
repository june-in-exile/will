import { HASH_CONFIG } from "@config";
import type { HashableInput } from "@shared/types/crypto.js";
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
    throw new Error(
      `Encoding validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Main Keccak256 hash function with comprehensive validation and encoding support
 */
function keccak256(
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

    return hash;
  } catch (error) {
    throw new Error(
      `Keccak256 hash generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { keccak256 }