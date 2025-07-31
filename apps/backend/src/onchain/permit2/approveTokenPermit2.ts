import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/environment.js";
import type { TokenApproval } from "@shared/types/environment.js";
import { APPROVAL_CONFIG, NETWORK_CONFIG } from "@config";
import { getTokenInfo, createSigner } from "@shared/utils/blockchain.js";
import { Estate } from "@shared/types/blockchain.js";
import { readWill } from "@shared/utils/file/readWill.js";
import { WillFileType, type FormattedWill } from "@shared/types/will.js";
import { validateNetwork } from "@shared/utils/validation/network.js";
import { ethers, Wallet } from "ethers";
import { createRequire } from "module";
import { ERC20_ABI } from "@shared/types/constants.js";
import chalk from "chalk";

const require = createRequire(import.meta.url);

// Load Permit2 SDK
const permit2SDK = require("@uniswap/permit2-sdk");

interface TokenForApproval {
  address: string;
  estates: number[];
  totalAmount: bigint;
}

interface TokenInfo extends TokenForApproval {
  name: string;
  symbol: string;
}

interface ApprovalResult {
  success: boolean;
  alreadyApproved: boolean;
  txHash?: string;
  error?: string;
}

interface TokenApprovalSummary {
  successful: number;
  alreadyApproved: number;
  failed: number;
  allSuccessful: boolean;
}

interface ProcessResult extends TokenApprovalSummary {
  permit2Address: string;
  signerAddress: string;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): TokenApproval {
  const result = validateEnvironment<TokenApproval>(
    presetValidations.tokenApproval(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  // Handle default PERMIT2 address from SDK if not provided
  if (!result.data.PERMIT2) {
    result.data.PERMIT2 = permit2SDK.PERMIT2;
  }

  return result.data;
}

/**
 * Extract unique tokens from estates
 */
function extractUniqueTokens(estates: Estate[]): TokenForApproval[] {
  const tokens = new Map<string, TokenForApproval>();

  estates.forEach((estate, index) => {
    const token = estate.token.toLowerCase();

    if (!tokens.has(token)) {
      tokens.set(token, {
        address: estate.token,
        estates: [index],
        totalAmount: estate.amount,
      });
    } else {
      const details = tokens.get(token)!;
      details.estates.push(index);
      details.totalAmount += estate.amount;
    }
  });

  return Array.from(tokens.values());
}

/**
 * Collect info for tokens to be approved
 */
async function getTokenInfos(tokens: TokenForApproval[], signer: Wallet): Promise<TokenInfo[]> {
  return Promise.all(
    tokens.map(async (token) => {
      const { name, symbol } = await getTokenInfo(token.address, signer);
      return {
        name,
        symbol,
        address: token.address,
        estates: token.estates,
        totalAmount: token.totalAmount,
      };
    })
  );
}

/**
 * Check current allowance
 */
async function checkCurrentAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  signer: Wallet,
): Promise<bigint> {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer,
    );
    const allowance = await tokenContract.allowance(
      ownerAddress,
      spenderAddress,
    );
    return allowance;
  } catch (error) {
    console.warn(
      chalk.yellow(
        `⚠️ Could not check allowance for ${tokenAddress}:`,
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
    return 0n;
  }
}

/**
 * Approve token with retry mechanism
 */
async function approveToken(
  token: TokenInfo,
  spenderAddress: string,
  signer: Wallet,
  retryCount: number = 1,
): Promise<ApprovalResult> {
  try {
    console.log(chalk.blue(`Approving token ${token} for Permit2...`));

    const ownerAddress = await signer.getAddress();
    const currentAllowance = await checkCurrentAllowance(
      token.address,
      ownerAddress,
      spenderAddress,
      signer,
    );

    if (currentAllowance >= ethers.MaxUint256 / 2n) {
      console.log(
        chalk.green(
          `✅ ${token.name} already has sufficient allowance`,
        ),
      );
      return { success: true, alreadyApproved: true };
    }

    const tokenContract = new ethers.Contract(
      token.address,
      ERC20_ABI,
      signer,
    );


    const tx = await tokenContract.approve(spenderAddress, ethers.MaxUint256);

    console.log(
      chalk.gray(`Approval transaction sent for ${token}:`),
      chalk.white(tx.hash),
    );

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    if (receipt!.status === 1) {
      console.log(
        chalk.green(
          `✅ Approval confirmed for ${token} (${token.symbol})`,
        ),
      );
      return { success: true, txHash: tx.hash, alreadyApproved: false };
    } else {
      throw new Error("Transaction failed");
    }
  } catch (error) {
    console.error(
      chalk.red(`❌ Error approving token ${token}:`),
      error instanceof Error ? error.message : "Unknown error",
    );

    // Retry logic
    if (retryCount < APPROVAL_CONFIG.maxRetries) {
      console.log(
        chalk.yellow(
          `⚠️ Retrying approval for ${token} (attempt ${retryCount + 1}/${APPROVAL_CONFIG.maxRetries})...`,
        ),
      );

      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, APPROVAL_CONFIG.retryDelay),
      );

      return approveToken(token, spenderAddress, signer, retryCount + 1);
    }
    return {
      success: false,
      alreadyApproved: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Print detailed Token information
 */
function printTokensForApproval(tokens: TokenInfo[]): void {
  console.log(chalk.cyan("\n=== Token Details ===\n"));

  tokens.forEach((token) => {
    console.log(
      chalk.gray(`- ${token.name} (${token.symbol}), address: ${token.address}, used in estates: ${token.estates.join(", ")}`),
    );
  });

  console.log(chalk.cyan("\n=== End of Token Details ==="));
}

/**
 * Process all token approvals
 */
async function executeTokenApprovals(
  tokens: TokenInfo[],
  spenderAddress: string,
  signer: Wallet,
): Promise<TokenApprovalSummary> {
  console.log(chalk.blue("\nStarting token approval process..."));

  printTokensForApproval(tokens);

  const successful: string[] = [];
  const failed: Array<{ token: string; error: string }> = [];
  const alreadyApproved: string[] = [];

  // Process approvals with controlled concurrency
  for (const token of tokens) {
    console.log(chalk.cyan(`\n--- Processing ${token.address} ---`));

    const result = await approveToken(token, spenderAddress, signer);

    if (result.success) {
      if (result.alreadyApproved) {
        alreadyApproved.push(token.address);
      } else {
        successful.push(token.address);
      }
    } else {
      failed.push({ token: token.address, error: result.error || "Unknown error" });
    }

    // Small delay between approvals to avoid rate limiting
    if (tokens.indexOf(token) < tokens.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Display summary
  console.log(chalk.cyan("\n📊 Approval Summary:"));
  console.log(chalk.green(`✅ Successful approvals: ${successful.length}`));
  if (successful.length > 0) {
    successful.forEach((token) => console.log(chalk.gray(`- ${token}`)));
  }

  console.log(chalk.gray(`ℹ️  Already approved: ${alreadyApproved.length}`));
  if (alreadyApproved.length > 0) {
    alreadyApproved.forEach((token) => console.log(chalk.gray(`- ${token}`)));
  }

  console.log(chalk.red(`❌ Failed approvals: ${failed.length}`));
  if (failed.length > 0) {
    failed.forEach(({ token, error }) => {
      console.log(chalk.red(`- ${token}: ${error}`));
    });
  }

  return {
    successful: successful.length,
    alreadyApproved: alreadyApproved.length,
    failed: failed.length,
    allSuccessful: failed.length === 0,
  };
}

/**
 * Process token approval workflow
 */
async function processTokenApproval(): Promise<ProcessResult> {
  try {
    const { TESTATOR_PRIVATE_KEY, PERMIT2 } = validateEnvironmentVariables();

    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const signer = await createSigner(TESTATOR_PRIVATE_KEY, provider);

    const willData: FormattedWill = readWill(WillFileType.FORMATTED);

    const tokens = extractUniqueTokens(willData.estates);

    if (tokens.length === 0) {
      console.log(chalk.yellow("⚠️ No tokens found to approve"));
      return {
        successful: 0,
        alreadyApproved: 0,
        failed: 0,
        allSuccessful: true,
        permit2Address: PERMIT2,
        signerAddress: await signer.getAddress(),
      };
    }

    const tokenInfos = await getTokenInfos(tokens, signer);

    const approvalResults = await executeTokenApprovals(
      tokenInfos,
      PERMIT2,
      signer,
    );

    if (approvalResults.allSuccessful) {
      console.log(
        chalk.green.bold("\n🎉 All token approvals completed successfully!"),
      );
    } else {
      console.log(
        chalk.yellow.bold(
          "\n⚠️ Some token approvals failed. Please check the logs above.",
        ),
      );
    }

    return {
      ...approvalResults,
      permit2Address: PERMIT2,
      signerAddress: await signer.getAddress(),
    };
  } catch (error) {
    console.error(
      chalk.red("Error during token approval process:"),
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
    console.log(chalk.bgCyan("\n=== Token Approval for Permit2 ===\n"));

    const result = await processTokenApproval();

    console.log(chalk.green.bold("\n✅ Process completed!"));
    console.log(chalk.gray("Results:"), result);
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
    console.error(chalk.red.bold("Uncaught error:"), error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  });
}

export {
  validateEnvironmentVariables,
  extractUniqueTokens,
  checkCurrentAllowance,
  approveToken,
  executeTokenApprovals,
  processTokenApproval,
};
