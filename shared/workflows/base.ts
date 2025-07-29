import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js"
import { existsSync, readFileSync, writeFileSync } from "fs";
import chalk from "chalk";

export abstract class BaseWorkflow<TInput, TResult> {
    // 抽象方法 - 子類必須實現
    abstract validateEnvironment(): any;
    abstract process(input: TInput): Promise<TResult>;

    // 可選方法 - 子類可選擇性實現
    validateFiles?(): void;

    // 統一執行流程
    async run(input: TInput): Promise<TResult> {
        this.validateEnvironment();
        this.validateFiles?.();
        return this.process(input);
    }

    // 通用輔助方法
    protected handleError(error: unknown, context: string): never {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(chalk.red(`Error during ${context}:`), errorMessage);
        throw error;
    }

    protected async updateEnvironmentVariables(updates: Record<string, string>): Promise<void> {
        try {
            const updatePromises = Object.entries(updates).map(([key, value]) =>
                updateEnvVariable(key, value)
            );
            await Promise.all(updatePromises);
            console.log(chalk.green("✅ Environment variables updated successfully"));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.warn(chalk.yellow("Warning: Failed to update environment variables:"), errorMessage);
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
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Failed to read JSON file ${path}: ${errorMessage}`);
        }
    }

    protected saveJsonFile<T>(path: string, data: T): void {
        try {
            writeFileSync(path, JSON.stringify(data, null, 4));
            console.log(chalk.green("✅ File saved to:"), path);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Failed to save file ${path}: ${errorMessage}`);
        }
    }
}


// 只需要基本驗證和檔案操作的檔案
// apps/backend/src/offchain/signature/transfer.ts                 // ✅ BaseWorkflow (只是簽名，不上鏈)
// apps/backend/src/offchain/signature/cid.ts                      // ✅ BaseWorkflow
// apps/backend/src/offchain/ipfs/upload.ts                        // ✅ BaseWorkflow  
// apps/backend/src/offchain/ipfs/download.ts                      // ✅ BaseWorkflow