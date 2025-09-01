import { PERMIT2_CONFIG } from "@config";
import chalk from "chalk";

function generateNonce(bytes: number = PERMIT2_CONFIG.maxNonceBytes, timestamp: number = Date.now()): bigint {
  try {
    console.log(chalk.blue(`Generating nonce...`));
    if (bytes > PERMIT2_CONFIG.maxNonceBytes) {
      throw new Error(`Nonce cannnot exceed ${PERMIT2_CONFIG.maxNonceBytes} bytes`);
    }
    if (bytes < 4) {
      throw new Error(`Nonce must be at least 4 bytes to include timestamp`);
    }

    // Generate random bytes for the first (bytes - 4) bytes
    const buf = crypto.getRandomValues(new Uint8Array(bytes - 4));

    // Convert uint32 timestamp to 4 bytes (big-endian)
    const timestampUint32 = timestamp >>> 0; // Convert to uint32
    const timestampBytes = new Uint8Array(4);
    timestampBytes[0] = (timestampUint32 >>> 24) & 0xFF;
    timestampBytes[1] = (timestampUint32 >>> 16) & 0xFF;
    timestampBytes[2] = (timestampUint32 >>> 8) & 0xFF;
    timestampBytes[3] = timestampUint32 & 0xFF;

    // Combine random bytes + timestamp bytes
    let nonce = 0n;

    // Add random bytes first
    for (let i = 0; i < buf.length; i++) {
      nonce = (nonce << 8n) | BigInt(buf[i]);
    }

    // Add timestamp bytes at the end (last 4 bytes)
    for (let i = 0; i < timestampBytes.length; i++) {
      nonce = (nonce << 8n) | BigInt(timestampBytes[i]);
    }

    console.log(chalk.gray("Generated nonce:"), nonce);
    return nonce;
  } catch (error) {
    throw new Error(
      `Failed to generate nonce: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { generateNonce };
