import { updateEnvVariable } from "./updateEnvVariable.js";
import chalk from "chalk";

function resetEnvVariable(key: string): void {
  updateEnvVariable(key, "");
}

function resetEnvVariables(keys: string[]): void {
  keys.forEach(resetEnvVariable);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  resetEnvVariables(args);
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  // Only run when executed directly
  main().catch((error: Error) => {
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}
