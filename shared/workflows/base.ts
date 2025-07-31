import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import chalk from "chalk";

export abstract class BaseWorkflow<TInput, TResult> {
  // Abstract methods - must be implemented by subclasses
  abstract validateEnvironment(): any;
  abstract process(input: TInput): Promise<TResult>;

  // Optional methods - subclasses can choose to implement
  validateFiles?(): void;

  // Unified execution flow
  async run(input: TInput): Promise<TResult> {
    this.validateEnvironment();
    this.validateFiles?.();
    return this.process(input);
  }

  // Common utility methods
  protected handleError(error: unknown, context: string): never {
    console.error(chalk.red(`Error during ${context}:`), error instanceof Error ? error.message : "Unknown error");
    throw error;
  }

  protected async updateEnvironmentVariables(
    updates: Record<string, string>,
  ): Promise<void> {
    try {
      const updatePromises = Object.entries(updates).map(([key, value]) =>
        updateEnvVariable(key, value),
      );
      await Promise.all(updatePromises);
      console.log(chalk.green("✅ Environment variables updated successfully"));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        chalk.yellow("Warning: Failed to update environment variables:"),
        errorMessage,
      );
    }
  }

  protected readJsonFile<T>(path: string): T {
    try {
      if (!existsSync(path)) {
        throw new Error(`File does not exist: ${path}`);
      }
      const content = readFileSync(path, "utf8");
      return JSON.parse(content);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to read JSON file ${path}: ${errorMessage}`);
    }
  }

  protected saveJsonFile<T>(path: string, data: T): void {
    try {
      writeFileSync(path, JSON.stringify(data, null, 4));
      console.log(chalk.green("✅ File saved to:"), path);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to save file ${path}: ${errorMessage}`);
    }
  }
}

// Files that only need basic validation and file operations
// apps/backend/src/offchain/signature/transfer.ts                 // ✅ BaseWorkflow (only signing, no on-chain)
// apps/backend/src/offchain/signature/cid.ts                      // ✅ BaseWorkflow
// apps/backend/src/offchain/ipfs/upload.ts                        // ✅ BaseWorkflow
// apps/backend/src/offchain/ipfs/download.ts                      // ✅ BaseWorkflow
