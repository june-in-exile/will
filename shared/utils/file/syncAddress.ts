import { PATHS_CONFIG } from "@config";
import { updateEnvVariable } from "./updateEnvVariable.js";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import chalk from "chalk";

// Type definitionsź
interface Receipt {
  contractAddress?: string;
  transactionHash?: string;
  blockNumber?: string;
  gasUsed?: string;
}

interface Transaction {
  transactionType?: string;
  contractAddress?: string;
  contractName?: string;
  hash?: string;
}

interface BroadcastData {
  receipts?: Receipt[];
  transactions?: Transaction[];
}

/**
 * Extract contract information from Foundry broadcast files
 */
class ContractAddressExtractor {
  private broadcastDir: string;

  constructor() {
    this.broadcastDir = PATHS_CONFIG.contracts.broadcastDir;
  }

  /**
   * Extract contract address
   * @param contractName - Contract name
   * @param chainId - Chain ID
   * @param options - Options
   * @returns Result object
   */
  extract(contractName: string, chainId: string): string {
    try {
      const broadcastPath = this.getBroadcastPath(contractName, chainId);

      if (!existsSync(broadcastPath)) {
        throw new Error(`Broadcast file not found: ${broadcastPath}`);
      }

      const broadcastData: BroadcastData = JSON.parse(
        readFileSync(broadcastPath, "utf8"),
      );

      // Priority: Extract from receipts
      const contractAddressFromReceipts =
        this.extractFromReceipts(broadcastData);
      if (contractAddressFromReceipts) {
        return contractAddressFromReceipts;
      }

      // Fallback: Extract from transactions
      const contractAddressFromTransaction =
        this.extractFromTransactions(broadcastData);
      if (contractAddressFromTransaction) {
        return contractAddressFromTransaction;
      }
      throw new Error("No contract address found in broadcast file");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        chalk.red(`Error processing broadcast file: ${errorMessage}`),
      );
      throw error;
    }
  }

  /**
   * Extract address from receipts
   */
  private extractFromReceipts(broadcastData: BroadcastData): string | null {
    if (!broadcastData.receipts || broadcastData.receipts.length === 0) {
      return null;
    }

    for (const receipt of broadcastData.receipts) {
      if (
        receipt.contractAddress &&
        this.isValidAddress(receipt.contractAddress)
      ) {
        return receipt.contractAddress;
      }
    }

    return null;
  }

  /**
   * Extract address from transactions
   */
  private extractFromTransactions(broadcastData: BroadcastData): string | null {
    if (
      !broadcastData.transactions ||
      broadcastData.transactions.length === 0
    ) {
      return null;
    }

    for (const transaction of broadcastData.transactions) {
      if (
        transaction.transactionType === "CREATE" &&
        transaction.contractAddress &&
        this.isValidAddress(transaction.contractAddress)
      ) {
        return transaction.contractAddress;
      }
    }

    return null;
  }

  /**
   * Get broadcast file path
   */
  private getBroadcastPath(contractName: string, chainId: string): string {
    return path.join(
      this.broadcastDir,
      `${contractName}.s.sol`,
      chainId,
      "run-latest.json",
    );
  }

  /**
   * Validate Ethereum address
   */
  private isValidAddress(address: string): boolean {
    return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * List all available contracts
   */
  listAvailableContracts(): string[] {
    try {
      if (!existsSync(this.broadcastDir)) {
        return [];
      }

      return readdirSync(this.broadcastDir)
        .filter((dir) => dir.endsWith(".s.sol"))
        .map((dir) => dir.replace(".s.sol", ""));
    } catch (error) {
      return [];
    }
  }

  /**
   * List all available chains for a contract
   */
  listAvailableChains(contractName: string): string[] {
    try {
      const contractDir = path.join(this.broadcastDir, `${contractName}.s.sol`);

      if (!existsSync(contractDir)) {
        return [];
      }

      return readdirSync(contractDir).filter((dir) => {
        const dirPath = path.join(contractDir, dir);
        return statSync(dirPath).isDirectory();
      });
    } catch (error) {
      return [];
    }
  }
}

/**
 * Command Line Interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const extractor = new ContractAddressExtractor();

  if (args.length < 3) {
    console.error(
      chalk.red(
        `❌ Usage: pnpm exec tsx ${process.argv[1]} <KEY> <CONTRACT_NAME> <CHAIN_ID>`,
      ),
    );
    console.error(
      chalk.gray(
        `📝 For example: pnpm exec tsx ${process.argv[1]} WILL_FACTORY WillFactory 31337`,
      ),
    );
    process.exit(1);
  }

  const [key, contractName, chainId] = args;

  const contractAddress: string = extractor.extract(contractName, chainId);
  updateEnvVariable(key, contractAddress);
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
