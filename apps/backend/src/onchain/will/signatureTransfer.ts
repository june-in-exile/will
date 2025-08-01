import { NETWORK_CONFIG } from "@config";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import { ethers, JsonRpcProvider, formatUnits } from "ethers";
import { validateNetwork } from "@shared/utils/validation/network.js";
import {
  getTokenBalance,
  createWallet,
  createContract,
} from "@shared/utils/blockchain.js";
import { Will, Will__factory } from "@shared/types/typechain-types/index.js";
import type {
  WillContractInfo,
  TokenBalance,
  BalanceSnapshot,
} from "@shared/types/blockchain.js";
import type { SignatureTransfer } from "@shared/types/environment.js";
import { updateEnvironmentVariables } from "@shared/utils/file/updateEnvVariable.js";
import { WILL_TYPE } from "@shared/constants/will.js";
import { readWillFields } from "@shared/utils/file/readWill.js";
import { getWillInfo } from "@shared/utils/blockchain.js";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";

interface ProcessResult {
  transactionHash: string;
  timestamp: number;
  gasUsed: bigint;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): SignatureTransfer {
  const result = validateEnvironment<SignatureTransfer>(
    presetValidations.signatureTransfer(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Check balances for all relevant addresses and tokens
 */
async function checkTokenBalancesOfAllRoles(
  provider: JsonRpcProvider,
  willInfo: WillContractInfo,
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
    throw new Error(
      `Failed to check token balances: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Print balance snapshot
 */
function printBalanceSnapshot(
  snapshot: BalanceSnapshot,
  title: string,
  willInfo: WillContractInfo,
): void {
  console.log(chalk.cyan(`\n=== ${title} ===`));
  console.log(
    chalk.gray("Timestamp:"),
    preview.timestamp(snapshot.timestamp * 1000),
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
  willInfo: WillContractInfo,
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

      const formattedDifference = formatUnits(
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
 * Print signature transfer information
 */
function printSignatureTransferData(
  nonce: string,
  deadline: string,
  signature: string,
): void {
  console.log(chalk.cyan("\n=== Signature Transfer Details ==="));

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
  willInfo: WillContractInfo,
  nonce: string,
  deadline: string,
  signature: string,
): Promise<ProcessResult> {
  try {
    console.log(
      chalk.blue("Executing signatureTransferToBeneficiaries transaction..."),
    );

    printSignatureTransferData(nonce, deadline, signature);

    // Execute transaction
    const tx = await contract.signatureTransferToBeneficiaries(
      BigInt(nonce),
      BigInt(deadline),
      signature,
    );

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
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    throw new Error(
      `Failed to execute signatureTransferToBeneficiaries: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Process signature transfer workflow
 */
async function processSignatureTransfer(): Promise<ProcessResult> {
  try {
    const { EXECUTOR_PRIVATE_KEY } = validateEnvironmentVariables();

    const fields = readWillFields(WILL_TYPE.DECRYPTED, ["will", "permit2"]);

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const wallet = createWallet(EXECUTOR_PRIVATE_KEY, provider);

    const contract = await createContract<Will>(
      fields.will,
      Will__factory,
      wallet,
    );

    const willInfo = await getWillInfo(contract);

    console.log(
      chalk.magenta.bold("\n🔍 Checking balances before execution..."),
    );
    const beforeSnapshot = await checkTokenBalancesOfAllRoles(provider, willInfo);
    printBalanceSnapshot(
      beforeSnapshot,
      "Token Balances Before Execution",
      willInfo,
    );

    const result = await executeSignatureTransfer(
      contract,
      willInfo,
      fields.permit2.nonce.toString(),
      fields.permit2.deadline.toString(),
      fields.permit2.signature.toString(),
    );

    console.log(
      chalk.magenta.bold("\n🔍 Checking balances after execution..."),
    );
    const afterSnapshot = await checkTokenBalancesOfAllRoles(provider, willInfo);
    printBalanceSnapshot(
      afterSnapshot,
      "Token Balances After Execution",
      willInfo,
    );

    compareBalanceSnapshots(beforeSnapshot, afterSnapshot, willInfo);

    await updateEnvironmentVariables([
      ["EXECUTE_WILL_TX_HASH", result.transactionHash],
      ["EXECUTE_WILL_TIMESTAMP", result.timestamp.toString()],
    ]);

    console.log(
      chalk.green.bold("\n🎉 Will execution process completed successfully!"),
    );

    return result;
  } catch (error) {
    console.error(
      chalk.red("Error during will execution process:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== Signature Transfer with Permit2 ===\n"));

    const result = await processSignatureTransfer();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      timestamp: `${preview.timestamp(result.timestamp * 1000)}`,
    });
  } catch (error) {
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      error instanceof Error ? error.message : "Unknown error",
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
  main().catch((error) => {
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export {
  executeSignatureTransfer,
  processSignatureTransfer,
};
