import { PATHS_CONFIG, NETWORK_CONFIG } from "@shared/config.js";
import { updateEnvVariable } from "@shared/utils/env";
import { validatePrivateKey } from "@shared/utils/format";
import { ethers, JsonRpcProvider, Network, Wallet, Contract } from "ethers";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });

// Testament ABI - only the functions we need
const TESTAMENT_ABI = [
  "function testator() external view returns (address)",
  "function executor() external view returns (address)",
  "function executed() external view returns (bool)",
  "function getAllEstates() external view returns (tuple(address beneficiary, address token, uint256 amount)[])",
  "function signatureTransferToBeneficiaries(uint256 nonce, uint256 deadline, bytes calldata signature) external",
  "event TestamentExecuted()",
];

// Type definitions
interface EnvironmentVariables {
  TESTAMENT_ADDRESS: string;
  EXECUTOR_PRIVATE_KEY: string;
  NONCE: string;
  DEADLINE: string;
  PERMIT2_SIGNATURE: string;
}

interface Estate {
  beneficiary: string;
  token: string;
  amount: bigint;
}

interface TestamentInfo {
  testator: string;
  executor: string;
  executed: boolean;
  estates: Estate[];
}

interface SignatureTransferResult {
  transactionHash: string;
  testamentAddress: string;
  timestamp: number;
  gasUsed: bigint;
  success: boolean;
  estateCount: number;
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
  const {
    TESTAMENT_ADDRESS,
    EXECUTOR_PRIVATE_KEY,
    NONCE,
    DEADLINE,
    PERMIT2_SIGNATURE,
  } = process.env;

  if (!TESTAMENT_ADDRESS) {
    throw new Error("Environment variable TESTAMENT_ADDRESS is not set");
  }

  if (!EXECUTOR_PRIVATE_KEY) {
    throw new Error("Environment variable EXECUTOR_PRIVATE_KEY is not set");
  }

  if (!NONCE) {
    throw new Error("Environment variable NONCE is not set");
  }

  if (!DEADLINE) {
    throw new Error("Environment variable DEADLINE is not set");
  }

  if (!PERMIT2_SIGNATURE) {
    throw new Error("Environment variable PERMIT2_SIGNATURE is not set");
  }

  if (!ethers.isAddress(TESTAMENT_ADDRESS)) {
    throw new Error(`Invalid testament address: ${TESTAMENT_ADDRESS}`);
  }

  if (!validatePrivateKey(EXECUTOR_PRIVATE_KEY)) {
    throw new Error("Invalid private key format");
  }

  // Validate nonce format (should be a number)
  if (!/^\d+$/.test(NONCE)) {
    throw new Error(`Invalid nonce format: ${NONCE}`);
  }

  // Validate deadline format (should be a number)
  if (!/^\d+$/.test(DEADLINE)) {
    throw new Error(`Invalid deadline format: ${DEADLINE}`);
  }

  // Validate signature format (should be hex string starting with 0x)
  if (!PERMIT2_SIGNATURE.match(/^0x[0-9a-fA-F]+$/)) {
    throw new Error("Invalid permit2 signature format");
  }

  // Validate signature length (should be 65 bytes = 130 hex chars + 0x prefix)
  if (PERMIT2_SIGNATURE.length !== 132) {
    throw new Error(
      `Invalid permit2 signature length: expected 132 characters, got ${PERMIT2_SIGNATURE.length}`
    );
  }

  // Validate deadline is in the future
  const deadlineTimestamp = parseInt(DEADLINE);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (deadlineTimestamp <= currentTimestamp) {
    console.warn(
      chalk.yellow(
        "⚠️  Warning: Deadline is in the past or very close to current time"
      )
    );
    console.warn(
      chalk.yellow(
        `Current time: ${currentTimestamp}, Deadline: ${deadlineTimestamp}`
      )
    );
  }

  return {
    TESTAMENT_ADDRESS,
    EXECUTOR_PRIVATE_KEY,
    NONCE,
    DEADLINE,
    PERMIT2_SIGNATURE,
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
 * Create testament contract instance with validation
 */
async function createTestamentContract(
  testamentAddress: string,
  wallet: Wallet
): Promise<Contract> {
  try {
    console.log(chalk.blue("Loading testament contract..."));

    if (!wallet.provider) {
      throw new Error("Wallet provider is null");
    }

    const code = await wallet.provider.getCode(testamentAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${testamentAddress}`);
    }

    const contract = new Contract(testamentAddress, TESTAMENT_ABI, wallet);

    console.log(chalk.green("✅ Testament contract loaded"));
    return contract;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to create testament contract instance: ${errorMessage}`
    );
  }
}

/**
 * Fetch testament information
 */
async function getTestamentInfo(contract: Contract): Promise<TestamentInfo> {
  try {
    console.log(chalk.blue("Fetching testament information..."));

    const [testator, executor, executed, estates] = await Promise.all([
      contract.testator(),
      contract.executor(),
      contract.executed(),
      contract.getAllEstates(),
    ]);

    const formattedEstates: Estate[] = estates.map((estate: any) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    console.log(chalk.green("✅ Testament information retrieved"));

    return {
      testator,
      executor,
      executed,
      estates: formattedEstates,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch testament info: ${errorMessage}`);
  }
}

/**
 * Validate execution prerequisites
 */
function validateExecutionPrerequisites(
  testamentInfo: TestamentInfo,
  executorAddress: string
): void {
  console.log(chalk.blue("Validating execution prerequisites..."));

  // Check if caller is the executor
  if (executorAddress.toLowerCase() !== testamentInfo.executor.toLowerCase()) {
    throw new Error(
      `Only executor can call this function. Expected: ${testamentInfo.executor}, Got: ${executorAddress}`
    );
  }

  // Check if testament has already been executed
  if (testamentInfo.executed) {
    throw new Error("Testament has already been executed");
  }

  // Check if there are estates to transfer
  if (testamentInfo.estates.length === 0) {
    throw new Error("No estates found in testament");
  }

  console.log(chalk.green("✅ Execution prerequisites validated"));
}

/**
 * Print signature transfer details
 */
function printSignatureTransferDetails(
  testamentInfo: TestamentInfo,
  nonce: string,
  deadline: string,
  signature: string
): void {
  console.log(chalk.cyan("\n=== Signature Transfer Details ==="));

  // Print Testament Info
  console.log(chalk.blue("\n🏛️  Testament Information:"));
  console.log(chalk.gray("- Testator:"), chalk.white(testamentInfo.testator));
  console.log(chalk.gray("- Executor:"), chalk.white(testamentInfo.executor));
  console.log(
    chalk.gray("- Executed:"),
    chalk.white(testamentInfo.executed.toString())
  );

  // Print Estates
  console.log(chalk.blue("\n💰 Estates to Transfer:"));
  testamentInfo.estates.forEach((estate, index) => {
    console.log(chalk.gray(`  Estate ${index}:`));
    console.log(
      chalk.gray("    - Beneficiary:"),
      chalk.white(estate.beneficiary)
    );
    console.log(chalk.gray("    - Token:"), chalk.white(estate.token));
    console.log(
      chalk.gray("    - Amount:"),
      chalk.white(estate.amount.toString())
    );
  });

  // Print Permit2 Parameters
  console.log(chalk.blue("\n📋 Permit2 Parameters:"));
  console.log(chalk.gray("- Nonce:"), chalk.white(nonce));
  console.log(chalk.gray("- Deadline:"), chalk.white(deadline));
  console.log(
    chalk.gray("- Deadline (Date):"),
    chalk.white(new Date(parseInt(deadline) * 1000).toISOString())
  );
  console.log(chalk.gray("- Signature:"), chalk.white(signature));

  console.log(chalk.cyan("\n=== End of Signature Transfer Details ===\n"));
}

/**
 * Execute signatureTransferToBeneficiaries transaction
 */
async function executeSignatureTransfer(
  contract: Contract,
  testamentInfo: TestamentInfo,
  nonce: string,
  deadline: string,
  signature: string,
  executorAddress: string
): Promise<SignatureTransferResult> {
  try {
    console.log(
      chalk.blue("Executing signatureTransferToBeneficiaries transaction...")
    );

    // Print detailed transfer information
    printSignatureTransferDetails(testamentInfo, nonce, deadline, signature);

    // Validate execution prerequisites
    validateExecutionPrerequisites(testamentInfo, executorAddress);

    // Convert string parameters to appropriate types
    const nonceBigInt = BigInt(nonce);
    const deadlineBigInt = BigInt(deadline);

    // Estimate gas
    const gasEstimate =
      await contract.signatureTransferToBeneficiaries.estimateGas(
        nonceBigInt,
        deadlineBigInt,
        signature
      );

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
    const tx = await contract.signatureTransferToBeneficiaries(
      nonceBigInt,
      deadlineBigInt,
      signature,
      {
        gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      }
    );

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

    // Check for TestamentExecuted event
    const testamentExecutedEvent = receipt.logs.find((log: ethers.Log) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "TestamentExecuted";
      } catch {
        return false;
      }
    });

    if (testamentExecutedEvent) {
      console.log(chalk.green("🎉 Testament executed successfully!"));
    } else {
      console.warn(
        chalk.yellow("⚠️  Warning: TestamentExecuted event not found in logs")
      );
    }

    return {
      transactionHash: receipt.hash,
      testamentAddress: await contract.getAddress(),
      timestamp: Date.now(),
      gasUsed: receipt.gasUsed,
      success: true,
      estateCount: testamentInfo.estates.length,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to execute signatureTransferToBeneficiaries: ${errorMessage}`
    );
  }
}

/**
 * Update environment variables with execution data
 */
async function updateEnvironmentVariables(
  result: SignatureTransferResult
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["EXECUTE_TESTAMENT_TX_HASH", result.transactionHash],
      ["EXECUTE_TESTAMENT_TIMESTAMP", result.timestamp.toString()],
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
 * Verify testament execution status
 */
async function verifyTestamentExecution(contract: Contract): Promise<void> {
  try {
    console.log(chalk.blue("Verifying testament execution status..."));

    const executed = await contract.executed();

    if (executed) {
      console.log(chalk.green("✅ Testament execution confirmed on-chain"));
    } else {
      console.warn(
        chalk.yellow("⚠️  Warning: Testament execution status not updated")
      );
    }
  } catch (error) {
    console.warn(
      chalk.yellow("Warning: Could not verify execution status"),
      error
    );
  }
}

/**
 * Process signature transfer workflow
 */
async function processSignatureTransfer(): Promise<SignatureTransferResult> {
  try {
    // Validate prerequisites
    const {
      TESTAMENT_ADDRESS,
      EXECUTOR_PRIVATE_KEY,
      NONCE,
      DEADLINE,
      PERMIT2_SIGNATURE,
    } = validateEnvironment();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create testament contract instance
    const contract = await createTestamentContract(TESTAMENT_ADDRESS, wallet);

    // Get testament information
    const testamentInfo = await getTestamentInfo(contract);

    // Execute signature transfer
    const result = await executeSignatureTransfer(
      contract,
      testamentInfo,
      NONCE,
      DEADLINE,
      PERMIT2_SIGNATURE,
      wallet.address
    );

    // Verify execution
    await verifyTestamentExecution(contract);

    // Update environment
    await updateEnvironmentVariables(result);

    console.log(
      chalk.green.bold(
        "\n🎉 Testament execution process completed successfully!"
      )
    );
    console.log(
      chalk.green.bold(
        `💰 ${result.estateCount} estate(s) transferred to beneficiaries!`
      )
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during testament execution process:"),
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
    const result = await processSignatureTransfer();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"));
    console.log(chalk.gray("- Transaction Hash:"), result.transactionHash);
    console.log(chalk.gray("- Testament Address:"), result.testamentAddress);
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
