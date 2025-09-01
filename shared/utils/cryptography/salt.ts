import { SALT_CONFIG } from "@config";
import chalk from "chalk";

function generateSalt(bytes: number = SALT_CONFIG.defaultSaltBytes): bigint {
  try {
    const buf = crypto.getRandomValues(new Uint8Array(bytes));

    let salt = 0n;
    for (let i = 0; i < buf.length; i++) {
      salt = (salt << 8n) | BigInt(buf[i]);
    }

    console.log(chalk.gray("Generated salt:"), salt);

    return salt;
  } catch (error) {
    throw new Error(
      `Failed to generate salt: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { generateSalt };
