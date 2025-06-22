import { PATHS_CONFIG, NETWORK_CONFIG } from "@shared/config.js";
import { updateEnvVariable } from "@shared/utils/env";
import { validatePrivateKey, validateCIDv1 } from "@shared/utils/format";
import { ethers, JsonRpcProvider, Network, Wallet } from "ethers";
import { TestamentFactory, TestamentFactory__factory } from "@shared/types";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Type definitions
interface EnvironmentVariables {
  TESTAMENT_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
  EXECUTOR_SIGNATURE: string;
}

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
function validateEnvironment(): EnvironmentVariables {
  const { TESTAMENT_FACTORY, EXECUTOR_PRIVATE_KEY, CID, EXECUTOR_SIGNATURE } =
    process.env;

  if (!TESTAMENT_FACTORY) {
    throw new Error("Environment variable TESTAMENT_FACTORY is not set");
  }

  if (!EXECUTOR_PRIVATE_KEY) {
    throw new Error("Environment variable EXECUTOR_PRIVATE_KEY is not set");
  }

  if (!CID) {
    throw new Error("Environment variable CID is not set");
  }

  if (!EXECUTOR_SIGNATURE) {
    throw new Error("Environment variable EXECUTOR_SIGNATURE is not set");
  }

  if (!ethers.isAddress(TESTAMENT_FACTORY)) {
    throw new Error(`Invalid testament factory address: ${TESTAMENT_FACTORY}`);
  }

  if (!validatePrivateKey(EXECUTOR_PRIVATE_KEY)) {
    throw new Error("Invalid private key format");
  }

  if (!validateCIDv1(CID)) {
    throw new Error("Invalid CID v1 format");
  }

  // Validate signature format (should be hex string starting with 0x)
  if (!EXECUTOR_SIGNATURE.match(/^0x[0-9a-fA-F]+$/)) {
    throw new Error("Invalid executor signature format");
  }

  // Validate signature length (should be 65 bytes = 130 hex chars + 0x prefix)
  if (EXECUTOR_SIGNATURE.length !== 132) {
    throw new Error(
      `Invalid executor signature length: expected 132 characters, got ${EXECUTOR_SIGNATURE.length}`
    );
  }

  return {
    TESTAMENT_FACTORY,
    EXECUTOR_PRIVATE_KEY,
    CID,
    EXECUTOR_SIGNATURE,
  };
}

/**
 * Validate RPC connection
 */
async function validateRpcConnection(
  provider: JsonRpcProvider
): Promise<Network> {
  try {
    console.log(chalk.blue("Validating RPC connection..."));
    const network = await provider.getNetwork();
    console.log(
      chalk.green("✅ Connected to network:"),
      network.name,
      `(Chain ID: ${network.chainId})`
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
  wallet: Wallet
): Promise<TestamentFactory> {
  try {
    console.log(chalk.blue("Loading testament factory contract..."));

    const contract = TestamentFactory__factory.connect(factoryAddress, wallet);

    if (!wallet.provider) {
      throw new Error("Wallet provider is null");
    }
    const code = await wallet.provider.getCode(factoryAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${factoryAddress}`);
    }

    console.log(chalk.green("✅ Testament factory contract loaded"));
    return contract;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create contract instance: ${errorMessage}`);
  }
}

/**
 * Validate CID status before notarization
 */
async function validateCIDStatus(
  contract: TestamentFactory,
  cid: string
): Promise<void> {
  try {
    console.log(chalk.blue("Validating CID status..."));

    // Check if CID has been validated by testator
    const testatorValidateTime = await contract.testatorValidateTimes(cid);

    if (testatorValidateTime === 0n) {
      throw new Error(
        `CID ${cid} has not been validated by testator yet. Please run uploadCID first.`
      );
    }

    console.log(
      chalk.green("✅ CID validated by testator at:"),
      new Date(Number(testatorValidateTime) * 1000).toISOString()
    );

    // Check if CID has already been notarized
    const executorValidateTime = await contract.executorValidateTimes(cid);

    if (executorValidateTime > 0n) {
      console.log(
        chalk.yellow("⚠️  Warning: CID already notarized at:"),
        new Date(Number(executorValidateTime) * 1000).toISOString()
      );
      console.log(chalk.yellow("Proceeding with re-notarization..."));
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to validate CID status: ${errorMessage}`);
  }
}

/**
 * Verify executor signature before transaction
 */
async function verifyExecutorSignature(
  contract: TestamentFactory,
  cid: string,
  signature: string
): Promise<void> {
  try {
    console.log(chalk.blue("Verifying executor signature..."));

    const isValid = await contract.verifyExecutorSignature(cid, signature);

    if (!isValid) {
      throw new Error("Executor signature verification failed");
    }

    console.log(chalk.green("✅ Executor signature verified successfully"));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Signature verification failed: ${errorMessage}`);
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
 * Execute notarizeCID transaction
 */
async function executeNotarizeCID(
  contract: TestamentFactory,
  cid: string,
  signature: string
): Promise<NotarizeResult> {
  try {
    console.log(chalk.blue("Executing notarizeCID transaction..."));

    // Print detailed notarization information
    printNotarizationDetails(cid, signature);

    // Validate CID status
    await validateCIDStatus(contract, cid);

    // Verify signature before transaction
    await verifyExecutorSignature(contract, cid, signature);

    // Estimate gas
    const gasEstimate = await contract.notarizeCID.estimateGas(cid, signature);

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
    const tx = await contract.notarizeCID(cid, signature, {
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
    throw new Error(`Failed to execute notarizeCID: ${errorMessage}`);
  }
}

/**
 * Update environment variables with notarization data
 */
async function updateEnvironmentVariables(
  result: NotarizeResult
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["NOTARIZE_TX_HASH", result.transactionHash],
      ["NOTARIZE_TIMESTAMP", result.timestamp.toString()],
    ];

    // Execute all updates in parallel
    await Promise.all(
      updates.map(([key, value]) => updateEnvVariable(key, value))
    );

    console.log(chalk.green("✅ Environment variables updated successfully"));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.warn(
      chalk.yellow("Warning: Failed to update environment variables:"),
      errorMessage
    );
  }
}

/**
 * Get contract information
 */
async function getContractInfo(contract: TestamentFactory): Promise<void> {
  try {
    console.log(chalk.blue("Fetching contract information..."));

    const [
      executor,
      uploadCIDVerifier,
      createTestamentVerifier,
      jsonCidVerifier,
    ] = await Promise.all([
      contract.executor(),
      contract.uploadCIDVerifier(),
      contract.createTestamentVerifier(),
      contract.jsonCidVerifier(),
    ]);

    console.log(chalk.gray("Contract addresses:"));
    console.log(chalk.gray("- Executor:"), executor);
    console.log(chalk.gray("- Testator Verifier:"), uploadCIDVerifier);
    console.log(chalk.gray("- Decryption Verifier:"), createTestamentVerifier);
    console.log(chalk.gray("- JSON CID Verifier:"), jsonCidVerifier);
  } catch (error) {
    console.warn(chalk.yellow("Warning: Could not fetch contract info"), error);
  }
}

/**
 * Process CID notarization workflow
 */
async function processNotarizeCID(): Promise<NotarizeResult> {
  try {
    // Validate prerequisites
    const { TESTAMENT_FACTORY, EXECUTOR_PRIVATE_KEY, CID, EXECUTOR_SIGNATURE } =
      validateEnvironment();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create contract instance
    const contract = await createContractInstance(TESTAMENT_FACTORY, wallet);

    // Get contract information
    await getContractInfo(contract);

    // Execute notarization
    const result = await executeNotarizeCID(contract, CID, EXECUTOR_SIGNATURE);

    // Update environment
    await updateEnvironmentVariables(result);

    console.log(
      chalk.green.bold("\n🎉 CID notarization process completed successfully!")
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during CID notarization process:"),
      errorMessage
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
      errorMessage
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
