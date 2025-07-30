import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import { updateEnvVariable } from "@shared/utils/file/updateEnvVariable.js";
import { validateEnvironment, presetValidations } from "@shared/utils/validation/environment.js";
import type { SignatureTransfer } from "@shared/types/environment.js";
import type { Estate, WillInfo, TokenBalance, BalanceSnapshot } from "@shared/types/blockchain.js";
import { ethers, JsonRpcProvider, Network, Wallet, Contract } from "ethers";
import { Will, Will__factory } from "@shared/types/typechain-types/index.js";
import { config } from "dotenv";
import chalk from "chalk";

// Load environment configuration
config({ path: PATHS_CONFIG.env });


interface SignatureTransferResult {
  transactionHash: string;
  willAddress: string;
  timestamp: number;
  gasUsed: bigint;
  success: boolean;
  estateCount: number;
}


// ERC20 ABI for token operations
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
];

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): SignatureTransfer {
  const result = validateEnvironment<SignatureTransfer>(presetValidations.signatureTransfer());

  if (!result.isValid) {
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`);
  }

  // Additional deadline validation warning
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Number(result.data.DEADLINE) <= currentTimestamp) {
    console.warn(
      chalk.yellow(
        "⚠️  Warning: Deadline is in the past or very close to current time",
      ),
    );
    console.warn(
      chalk.yellow(
        `Current time: ${currentTimestamp}, Deadline: ${result.data.DEADLINE}`,
      ),
    );
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
 * Create will contract instance with validation
 */
async function createWillContract(
  willAddress: string,
  wallet: Wallet,
): Promise<Will> {
  try {
    console.log(chalk.blue("Loading will contract..."));

    if (!wallet.provider) {
      throw new Error("Wallet provider is null");
    }

    const code = await wallet.provider.getCode(willAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${willAddress}`);
    }

    const contract = Will__factory.connect(willAddress, wallet);

    console.log(chalk.green("✅ Will contract loaded"));
    return contract;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create will contract instance: ${errorMessage}`);
  }
}

/**
 * Fetch will information
 */
async function getWillInfo(contract: Will): Promise<WillInfo> {
  try {
    console.log(chalk.blue("Fetching will information..."));

    const [testator, executor, executed, estates] = await Promise.all([
      contract.testator(),
      contract.executor(),
      contract.executed(),
      contract.getAllEstates(),
    ]);

    const formattedEstates: Estate[] = estates.map((estate: Estate) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    console.log(chalk.green("✅ Will information retrieved"));

    return {
      testator,
      executor,
      executed,
      estates: formattedEstates,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch will info: ${errorMessage}`);
  }
}

/**
 * Get token balance for a specific address and token
 */
async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  holderAddress: string,
): Promise<TokenBalance> {
  try {
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

    const [balance, symbol, decimals] = await Promise.all([
      tokenContract.balanceOf(holderAddress),
      tokenContract.symbol().catch(() => "UNKNOWN"),
      tokenContract.decimals().catch(() => 18),
    ]);

    const formattedBalance = ethers.formatUnits(balance, decimals);

    return {
      address: holderAddress,
      tokenAddress,
      balance,
      formattedBalance,
      symbol,
      decimals,
    };
  } catch (error) {
    console.warn(
      chalk.yellow(
        `Warning: Failed to fetch token balance for ${tokenAddress} at ${holderAddress}:`,
      ),
      error instanceof Error ? error.message : "Unknown error",
    );

    return {
      address: holderAddress,
      tokenAddress,
      balance: 0n,
      formattedBalance: "0",
      symbol: "ERROR",
      decimals: 18,
    };
  }
}

/**
 * Check balances for all relevant addresses and tokens
 */
async function checkTokenBalances(
  provider: JsonRpcProvider,
  willInfo: WillInfo,
): Promise<BalanceSnapshot> {
  try {
    console.log(chalk.blue("Checking token balances..."));

    const balances: TokenBalance[] = [];
    const uniqueTokens = [
      ...new Set(willInfo.estates.map((estate) => estate.token)),
    ];
    const allAddresses = [
      willInfo.testator,
      willInfo.executor,
      ...willInfo.estates.map((estate) => estate.beneficiary),
    ];
    const uniqueAddresses = [...new Set(allAddresses)];

    // Check balances for all combinations of addresses and tokens
    for (const tokenAddress of uniqueTokens) {
      for (const address of uniqueAddresses) {
        const balance = await getTokenBalance(provider, tokenAddress, address);
        balances.push(balance);
      }
    }

    console.log(
      chalk.green(
        `✅ Checked balances for ${balances.length} address-token pairs`,
      ),
    );

    return {
      timestamp: Math.floor(Date.now() / 1000),
      balances,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to check token balances: ${errorMessage}`);
  }
}

/**
 * Print balance snapshot
 */
function printBalanceSnapshot(
  snapshot: BalanceSnapshot,
  title: string,
  willInfo: WillInfo,
): void {
  console.log(chalk.cyan(`\n=== ${title} ===`));
  console.log(
    chalk.gray("Timestamp:"),
    new Date(snapshot.timestamp).toISOString(),
  );

  // Group balances by token
  const balancesByToken = snapshot.balances.reduce(
    (acc, balance) => {
      if (!acc[balance.tokenAddress]) {
        acc[balance.tokenAddress] = [];
      }
      acc[balance.tokenAddress].push(balance);
      return acc;
    },
    {} as Record<string, TokenBalance[]>,
  );

  Object.entries(balancesByToken).forEach(([tokenAddress, balances]) => {
    const symbol = balances[0]?.symbol || "UNKNOWN";
    console.log(chalk.blue(`\n💰 Token: ${symbol} (${tokenAddress})`));

    balances.forEach((balance) => {
      const addressType =
        balance.address.toLowerCase() === willInfo.testator.toLowerCase()
          ? "Testator"
          : balance.address.toLowerCase() === willInfo.executor.toLowerCase()
            ? "Executor"
            : "Beneficiary";

      console.log(
        chalk.gray(
          `  ${addressType} (${balance.address.slice(0, 6)}...${balance.address.slice(-4)}):`,
        ),
        chalk.white(`${balance.formattedBalance} ${balance.symbol}`),
      );
    });
  });

  console.log(chalk.cyan(`=== End of ${title} ===\n`));
}

/**
 * Compare balance snapshots and print differences
 */
function compareBalanceSnapshots(
  beforeSnapshot: BalanceSnapshot,
  afterSnapshot: BalanceSnapshot,
  willInfo: WillInfo,
): void {
  console.log(chalk.cyan("\n=== Balance Changes Summary ==="));

  const beforeMap = new Map(
    beforeSnapshot.balances.map((b) => [`${b.address}-${b.tokenAddress}`, b]),
  );

  const afterMap = new Map(
    afterSnapshot.balances.map((b) => [`${b.address}-${b.tokenAddress}`, b]),
  );

  let hasChanges = false;

  for (const [key, afterBalance] of afterMap) {
    const beforeBalance = beforeMap.get(key);
    if (!beforeBalance) continue;

    const difference = afterBalance.balance - beforeBalance.balance;
    if (difference !== 0n) {
      hasChanges = true;
      const addressType =
        afterBalance.address.toLowerCase() === willInfo.testator.toLowerCase()
          ? "Testator"
          : afterBalance.address.toLowerCase() ===
            willInfo.executor.toLowerCase()
            ? "Executor"
            : "Beneficiary";

      const formattedDifference = ethers.formatUnits(
        difference < 0n ? -difference : difference,
        afterBalance.decimals,
      );

      const changeColor = difference > 0n ? chalk.green : chalk.red;
      const changeSymbol = difference > 0n ? "+" : "-";

      console.log(
        chalk.gray(
          `${addressType} (${afterBalance.address.slice(0, 6)}...${afterBalance.address.slice(-4)}):`,
        ),
        chalk.gray(`${afterBalance.symbol}`),
        changeColor(`${changeSymbol}${formattedDifference}`),
      );
    }
  }

  if (!hasChanges) {
    console.log(chalk.yellow("No balance changes detected"));
  }

  console.log(chalk.cyan("=== End of Balance Changes Summary ===\n"));
}

/**
 * Print signature transfer details
 */
function printSignatureTransferDetails(
  willInfo: WillInfo,
  nonce: string,
  deadline: string,
  signature: string,
): void {
  console.log(chalk.cyan("\n=== Signature Transfer Details ==="));

  // Print Will Info
  console.log(chalk.blue("\n🏛️  Will Information:"));
  console.log(chalk.gray("- Testator:"), chalk.white(willInfo.testator));
  console.log(chalk.gray("- Executor:"), chalk.white(willInfo.executor));
  console.log(
    chalk.gray("- Executed:"),
    chalk.white(willInfo.executed.toString()),
  );

  // Print Estates
  console.log(chalk.blue("\n💰 Estates to Transfer:"));
  willInfo.estates.forEach((estate, index) => {
    console.log(chalk.gray(`  Estate ${index}:`));
    console.log(
      chalk.gray("    - Beneficiary:"),
      chalk.white(estate.beneficiary),
    );
    console.log(chalk.gray("    - Token:"), chalk.white(estate.token));
    console.log(
      chalk.gray("    - Amount:"),
      chalk.white(estate.amount.toString()),
    );
  });

  // Print Permit2 Parameters
  console.log(chalk.blue("\n📋 Permit2 Parameters:"));
  console.log(chalk.gray("- Nonce:"), chalk.white(nonce));
  console.log(chalk.gray("- Deadline:"), chalk.white(deadline));
  console.log(
    chalk.gray("- Deadline (Date):"),
    chalk.white(new Date(parseInt(deadline) * 1000).toISOString()),
  );
  console.log(chalk.gray("- Signature:"), chalk.white(signature));

  console.log(chalk.cyan("\n=== End of Signature Transfer Details ===\n"));
}

/**
 * Execute signatureTransferToBeneficiaries transaction
 */
async function executeSignatureTransfer(
  contract: Will,
  willInfo: WillInfo,
  nonce: string,
  deadline: string,
  signature: string,
): Promise<SignatureTransferResult> {
  try {
    console.log(
      chalk.blue("Executing signatureTransferToBeneficiaries transaction..."),
    );

    // Print detailed transfer information
    printSignatureTransferDetails(willInfo, nonce, deadline, signature);

    // Convert string parameters to appropriate types
    const nonceBigInt = BigInt(nonce);
    const deadlineBigInt = BigInt(deadline);

    // Estimate gas
    const gasEstimate =
      await contract.signatureTransferToBeneficiaries.estimateGas(
        nonceBigInt,
        deadlineBigInt,
        signature,
      );

    console.log(chalk.gray("Estimated gas:"), gasEstimate.toString());

    // Execute transaction
    const tx = await contract.signatureTransferToBeneficiaries(
      nonceBigInt,
      deadlineBigInt,
      signature,
      {
        gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      },
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

    // Check for WillExecuted event
    const willExecutedEvent = receipt.logs.find((log: ethers.Log) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "WillExecuted";
      } catch {
        return false;
      }
    });

    if (willExecutedEvent) {
      console.log(chalk.green("🎉 Will executed successfully!"));
    } else {
      console.warn(
        chalk.yellow("⚠️  Warning: WillExecuted event not found in logs"),
      );
    }

    return {
      transactionHash: receipt.hash,
      willAddress: await contract.getAddress(),
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: receipt.gasUsed,
      success: true,
      estateCount: willInfo.estates.length,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to execute signatureTransferToBeneficiaries: ${errorMessage}`,
    );
  }
}

/**
 * Update environment variables with execution data
 */
async function updateEnvironmentVariables(
  result: SignatureTransferResult,
): Promise<void> {
  try {
    console.log(chalk.blue("Updating environment variables..."));

    const updates: Array<[string, string]> = [
      ["EXECUTE_WILL_TX_HASH", result.transactionHash],
      ["EXECUTE_WILL_TIMESTAMP", result.timestamp.toString()],
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
 * Process signature transfer workflow
 */
async function processSignatureTransfer(): Promise<SignatureTransferResult> {
  try {
    // Validate prerequisites
    const { WILL, EXECUTOR_PRIVATE_KEY, NONCE, DEADLINE, PERMIT2_SIGNATURE } =
      validateEnvironmentVariables();

    // Initialize provider and validate connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateRpcConnection(provider);

    // Create wallet instance
    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    // Create will contract instance
    const contract = await createWillContract(WILL, wallet);

    // Get will information
    const willInfo = await getWillInfo(contract);

    // Check balances before execution
    console.log(
      chalk.magenta.bold("\n🔍 Checking balances before execution..."),
    );
    const beforeSnapshot = await checkTokenBalances(provider, willInfo);
    printBalanceSnapshot(
      beforeSnapshot,
      "Token Balances Before Execution",
      willInfo,
    );

    // Execute signature transfer
    const result = await executeSignatureTransfer(
      contract,
      willInfo,
      NONCE,
      DEADLINE,
      PERMIT2_SIGNATURE,
    );

    // Check balances after execution
    console.log(
      chalk.magenta.bold("\n🔍 Checking balances after execution..."),
    );
    const afterSnapshot = await checkTokenBalances(provider, willInfo);
    printBalanceSnapshot(
      afterSnapshot,
      "Token Balances After Execution",
      willInfo,
    );

    // Compare and show differences
    compareBalanceSnapshots(beforeSnapshot, afterSnapshot, willInfo);

    // Update environment
    await updateEnvironmentVariables(result);

    console.log(
      chalk.green.bold("\n🎉 Will execution process completed successfully!"),
    );
    console.log(
      chalk.green.bold(
        `💰 ${result.estateCount} estate(s) transferred to beneficiaries!`,
      ),
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red("Error during will execution process:"),
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
    const result = await processSignatureTransfer();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"));
    console.log(chalk.gray("- Transaction Hash:"), result.transactionHash);
    console.log(chalk.gray("- Will Address:"), result.willAddress);
    console.log(chalk.gray("- Estates Transferred:"), result.estateCount);
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
  createWillContract,
  getWillInfo,
  getTokenBalance,
  checkTokenBalances,
  printBalanceSnapshot,
  compareBalanceSnapshots,
  printSignatureTransferDetails,
  executeSignatureTransfer,
  updateEnvironmentVariables,
  processSignatureTransfer
}
