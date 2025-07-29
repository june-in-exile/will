import type { NotarizeCid } from "@shared/types/environment.js";
import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js";
import { validateEnvironment, presetValidations } from "@shared/utils/validation/environment.js";
import {
  WillFactory,
  WillFactory__factory,
} from "@shared/types/typechain-types/index.js";
import { ethers, JsonRpcProvider, Network, Wallet } from "ethers";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

interface NotarizeResult {
  transactionHash: string;
  cid: string;
  timestamp: number;
  gasUsed: bigint;
  success: boolean;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): NotarizeCid {
  const result = validateEnvironment<NotarizeCid>(presetValidations.notarizeCid());

  if (!result.isValid) {
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`);
  }

  return result.data;
}

/**
 * Validate RPC connection
 */
async function validateRpcConnection(
  provider: JsonRpcProvider,
): Promise<Network> {
  try {
    console.log(chalk.blue("Validating RPC connection..."));
    const network = await provider.getNetwork();
    console.log(
      chalk.green("✅ Connected to network:"),
      network.name,
      `(Chain ID: ${network.chainId})`,
    );
    return network;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to connect to RPC endpoint: ${errorMessage}`);
  }
}

/**
 * Create wallet instance
 */
function createWallet(privateKey: string, provider: JsonRpcProvider): Wallet {
  try {
    console.log(chalk.blue("Creating wallet instance..."));
    const wallet = new Wallet(privateKey, provider);
    console.log(chalk.green("✅ Wallet created:"), wallet.address);
    return wallet;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create wallet: ${errorMessage}`);
  }
}

/**
 * Create contract instance with validation
 */
async function createContractInstance(
  factoryAddress: string,
  wallet: Wallet,
): Promise<WillFactory> {
  try {
    console.log(chalk.blue("Loading will factory contract..."));

    const contract = WillFactory__factory.connect(factoryAddress, wallet);

    if (!wallet.provider) {
      throw new Error("Wallet provider is null");
    }
    const code = await wallet.provider.getCode(factoryAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${factoryAddress}`);
    }

    console.log(chalk.green("✅ Will factory contract loaded"));
    return contract;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create contract instance: ${errorMessage}`);
  }
}

/**
 * Print notarization details
 */
function printNotarizationDetails(cid: string, signature: string): void {
  console.log(chalk.cyan("\n=== Notarization Details ==="));

  console.log(chalk.blue("\n📋 CID Information:"));
  console.log(chalk.gray("- CID:"), chalk.white(cid));

  console.log(chalk.blue("\n✍️  Signature Information:"));
  console.log(chalk.gray("- Signature:"), chalk.white(signature));
  console.log(chalk.gray("- Signature Length:"), chalk.white(signature.length));

  console.log(chalk.cyan("\n=== End of Notarization Details ===\n"));
}

/**
 * Execute notarizeCid transaction
 */
async function executeNotarizeCID(
  contract: WillFactory,
  cid: string,
  signature: string,
): Promise<NotarizeResult> {
  try {
    console.log(chalk.blue("Executing notarizeCid transaction..."));

    // Print detailed notarization information
    printNotarizationDetails(cid, signature);

    // Estimate gas
    const gasEstimate = await contract.notarizeCid.estimateGas(cid, signature);

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
    const tx = await contract.notarizeCid(cid, signature, {
      gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
    });

    console.log(chalk.yellow("Transaction sent:"), tx.hash);
    console.log(chalk.blue("Waiting for confirmation..."));

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    if (receipt.status !== 1) {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }

    console.log(chalk.green("✅ Transaction confirmed:"), receipt.hash);
    console.log(chalk.gray("Block number:"), receipt.blockNumber);
    console.log(chalk.gray("Gas used:"), receipt.gasUsed.toString());

    return {
      transactionHash: receipt.hash,
      cid: cid,
      timestamp: Date.now(),
      gasUsed: receipt.gasUsed,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to execute notarizeCid: ${errorMessage}`);
  }
}

/**
 * Update environment variables with notarization data
 */
async function updateEnvironmentVariables(
  result: NotarizeResult,
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["NOTARIZE_TX_HASH", result.transactionHash],
      ["NOTARIZE_TIMESTAMP", result.timestamp.toString()],
    ];

    // Execute all updates in parallel
    await Promise.all(
      updates.map(([key, value]) => updateEnvVariable(key, value)),
    );

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

/**
 * Process CID notarization workflow
 */
async function processNotarizeCID(): Promise<NotarizeResult> {
  try {
    // Validate prerequisites
    const { WILL_FACTORY, EXECUTOR_PRIVATE_KEY, CID, EXECUTOR_SIGNATURE } =
      validateEnvironmentVariables();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create contract instance
    const contract = await createContractInstance(WILL_FACTORY, wallet);

    // Execute notarization
    const result = await executeNotarizeCID(contract, CID, EXECUTOR_SIGNATURE);

    // Update environment
    await updateEnvironmentVariables(result);

    console.log(
      chalk.green.bold("\n🎉 CID notarization process completed successfully!"),
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during CID notarization process:"),
      errorMessage,
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const result = await processNotarizeCID();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"));
    console.log(chalk.gray("- Transaction Hash:"), result.transactionHash);
    console.log(chalk.gray("- CID:"), result.cid);
    console.log(chalk.gray("- Gas Used:"), result.gasUsed.toString());
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      errorMessage,
    );

    // Log stack trace in development mode
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(chalk.gray("Stack trace:"), error.stack);
    }

    process.exit(1);
  }
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

export {
  validateEnvironmentVariables,
  validateRpcConnection,
  createWallet,
  createContractInstance,
  printNotarizationDetails,
  executeNotarizeCID,
  updateEnvironmentVariables,
  processNotarizeCID
}
