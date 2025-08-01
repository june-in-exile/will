import { PERMIT2_CONFIG } from "@config";
import chalk from "chalk";

function generateSecureNonce(): number {
  try {
    console.log(chalk.blue(`Generating nonce...`));

    const randomArray = new Uint32Array(2);
    crypto.getRandomValues(randomArray);

    // Combine two 32-bit values to get better distribution
    const nonce = (BigInt(randomArray[0]) << 32n) | BigInt(randomArray[1]);
    const nonceNumber = Number(nonce % BigInt(PERMIT2_CONFIG.maxNonceValue));

    console.log(chalk.gray("Generated nonce:"), nonceNumber);
    return nonceNumber;
  } catch (error) {
    throw new Error(
      `Failed to generate nonce: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { generateSecureNonce };
