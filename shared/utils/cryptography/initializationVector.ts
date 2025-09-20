import { CRYPTO_CONFIG } from "@config";
import { randomBytes } from "crypto";
import chalk from "chalk";

function generateInitializationVector(
  size: number = CRYPTO_CONFIG.ivSize,
): Buffer {
  try {
    console.log(chalk.blue("🎲 Generating new initialization vector..."));
    const iv = randomBytes(size);
    console.log(chalk.green("✅ New IV generated:", iv.toString("base64")));
    return iv;
  } catch (error) {
    throw new Error(
      `Failed to get initialization vector: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { generateInitializationVector };
