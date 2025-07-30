import { existsSync } from "fs";
import chalk from "chalk";

function validateFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
      throw new Error(`Required file does not exist: ${filePath}`);
    }
  }

  console.log(chalk.green("✅ Required files validated"));
}

export { validateFiles };
