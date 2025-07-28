import { PATHS_CONFIG } from "@config";
import { readFileSync, writeFileSync } from "fs";
import chalk from "chalk";

export function updateEnvVariable(key: string, value: string): void {
  const envPath = PATHS_CONFIG.env;
  try {
    let envContent = readFileSync(envPath, "utf8");

    // Use word boundaries to match exact key names
    const regex = new RegExp(`\\b${key}\\b=.*`, "g");

    if (regex.test(envContent)) {
      // Reset regex lastIndex and replace existing variable
      regex.lastIndex = 0;
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Append new variable, ensuring proper line ending
      const separator = envContent.endsWith("\n") ? "" : "\n";
      envContent += `${separator}${key}=${value}`;
    }

    writeFileSync(envPath, envContent);
    console.log(chalk.yellow(`Set ${key} to ${value} in .env file.`));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red(`Failed to update ${key} in ${envPath}: ${errorMessage}`),
    );
    throw error;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      chalk.red(`❌ Usage: pnpm exec tsx ${process.argv[1]} <KEY> <VALUE>`),
    );
    console.error(
      chalk.gray(
        `📝 For example: pnpm exec tsx ${process.argv[1]} USE_ANVIL true`,
      ),
    );
    console.error(
      chalk.gray(
        `👉 Refer to resetEnvVariable.ts if you want to reset the environment variable.`,
      ),
    );
    process.exit(1);
  }
  const [key, value] = args;
  updateEnvVariable(key, value);
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  // Only run when executed directly
  main().catch((error: Error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red.bold("Uncaught error:"), errorMessage);
    process.exit(1);
  });
}
